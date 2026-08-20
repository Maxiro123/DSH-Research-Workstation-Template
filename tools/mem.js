#!/usr/bin/env node
/**
 * mem — persistent memory graph for DSH agents.
 *
 * A zero-dependency SQLite-backed knowledge network with Obsidian-style
 * bidirectional links. Lives OUTSIDE the DSH runtime (no harness modification):
 * data at ~/.dsh/memory/memory.db, invoked as a plain CLI from any workspace.
 *
 * Node >= 22.13 required (node:sqlite without the experimental flag; 22.5–22.12
 * and 23.0–23.3 need --experimental-sqlite). No npm packages.
 *
 * Commands:
 *   mem add <title> [--content TEXT] [--type TYPE] [--tags a,b,c] [--project P] [--link id,id] [--source S]
 *   mem get <id>                 full node + one-hop neighbors
 *   mem search <query> [--limit N] [--project P] [--type T]
 *   mem graph <id> [--depth N] [--limit N]
 *   mem link <from> <to> [--relation R] [--both]
 *   mem unlink <from> <to>
 *   mem tags [--tag T]
 *   mem recent [--limit N]
 *   mem lessons [--search KW] [--limit N]
 *   mem stats
 *   mem ingest [--session ID | --all] [--dry-run]   # also extracts lessons from mistakes
 *   mem export [--out FILE]      dump graph as JSON (nodes + links)
 */
'use strict';

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('mem 需要 Node >= 22.13（22.5–22.12 需加 --experimental-sqlite 标志启动）。当前版本: ' + process.version);
  process.exit(1);
}
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const MEM_DIR = path.join(HOME, 'memory');
const DB_PATH = path.join(MEM_DIR, 'memory.db');
const SESSIONS_DIR = path.join(HOME, 'sessions');

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

function openDb() {
  fs.mkdirSync(MEM_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'note',
      content    TEXT NOT NULL DEFAULT '',
      tags       TEXT NOT NULL DEFAULT '',
      project    TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS links (
      source   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      target   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      relation TEXT NOT NULL DEFAULT 'related',
      created_at INTEGER NOT NULL,
      PRIMARY KEY (source, target, relation)
    );
    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target);
    CREATE INDEX IF NOT EXISTS idx_nodes_updated ON nodes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_nodes_title ON nodes(title);
    CREATE VIRTUAL TABLE IF NOT EXISTS node_fts USING fts5(
      title, content, tags,
      content='nodes', content_rowid='rowid',
      tokenize='trigram'
    );
    CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
      INSERT INTO node_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
      INSERT INTO node_fts(node_fts, rowid, title, content, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
      INSERT INTO node_fts(node_fts, rowid, title, content, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      INSERT INTO node_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END;
  `);
  return db;
}

function now() {
  return Date.now();
}

function genId(title) {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  const suffix = crypto.randomBytes(3).toString('hex');
  return slug ? `${slug}-${suffix}` : `node-${suffix}`;
}

// ---------------------------------------------------------------------------
// Node + link operations
// ---------------------------------------------------------------------------

function nodeExists(db, id) {
  return db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id) !== undefined;
}

function addNode(db, opts) {
  const id = opts.id || genId(opts.title);
  const tags = (opts.tags || '').split(',').map(t => t.trim()).filter(Boolean).join(',');
  const ts = now();
  const existing = db.prepare('SELECT id FROM nodes WHERE id = ?').get(id);
  if (existing) {
    db.prepare(`UPDATE nodes SET title=?, content=?, tags=?, project=?, type=?, source=?, updated_at=? WHERE id=?`)
      .run(opts.title, opts.content || '', tags, opts.project || '', opts.type || 'note', opts.source || '', ts, id);
  } else {
    db.prepare(`INSERT INTO nodes (id, title, type, content, tags, project, source, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, opts.title, opts.type || 'note', opts.content || '', tags, opts.project || '', opts.source || '', ts, ts);
  }
  // auto-link to explicitly given ids
  for (const target of (opts.link || [])) {
    if (target && target !== id && nodeExists(db, target)) {
      linkNodes(db, id, target, 'related');
    }
  }
  return id;
}

function linkNodes(db, from, to, relation = 'related') {
  if (from === to) return false;
  if (!nodeExists(db, from) || !nodeExists(db, to)) return false;
  const stmt = db.prepare(`INSERT OR IGNORE INTO links (source, target, relation, created_at) VALUES (?, ?, ?, ?)`);
  const a = stmt.run(from, to, relation, now());
  return a.changes > 0;
}

function unlinkNodes(db, from, to) {
  const r1 = db.prepare('DELETE FROM links WHERE source=? AND target=?').run(from, to);
  const r2 = db.prepare('DELETE FROM links WHERE source=? AND target=?').run(to, from);
  return r1.changes + r2.changes;
}

function getNode(db, id) {
  return db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
}

function neighbors(db, id) {
  return db.prepare(`
    SELECT l.relation, n.id, n.title, n.type, n.tags, n.project,
           CASE WHEN l.source = ? THEN l.target ELSE l.source END AS neighbor_id
    FROM links l JOIN nodes n ON n.id = CASE WHEN l.source = ? THEN l.target ELSE l.source END
    WHERE l.source = ? OR l.target = ?
  `).all(id, id, id, id);
}

// ---------------------------------------------------------------------------
// Search (FTS5 trigram + LIKE fallback for short Chinese)
// ---------------------------------------------------------------------------

function searchNodes(db, query, limit = 8, project, type) {
  const q = query.trim();
  if (!q) return [];
  const rows = [];
  const seen = new Set();

  const push = (row) => {
    if (!row || seen.has(row.id)) return;
    if (project && row.project !== project) return;
    if (type && row.type !== type) return;
    seen.add(row.id);
    rows.push(row);
  };

  // 1) FTS5 trigram match (works for >=3 chars, English and Chinese substrings)
  try {
    const ftsQuery = q.length >= 3 ? `"${q.replace(/"/g, '""')}"` : q;
    const hits = db.prepare(`
      SELECT n.* FROM node_fts f JOIN nodes n ON n.rowid = f.rowid
      WHERE node_fts MATCH ? ORDER BY rank LIMIT ?
    `).all(ftsQuery, limit * 4);
    for (const h of hits) push(h);
  } catch { /* trigram rejects <3 chars or odd queries — fall through to LIKE */ }

  // 2) LIKE fallback (handles 1-2 char Chinese, partial matches)
  if (rows.length < limit) {
    const pat = `%${q}%`;
    const hits = db.prepare(`
      SELECT * FROM nodes WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
      ORDER BY updated_at DESC LIMIT ?
    `).all(pat, pat, pat, limit * 2);
    for (const h of hits) push(h);
  }

  return rows.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Graph traversal (BFS along bidirectional links)
// ---------------------------------------------------------------------------

function graphBFS(db, seedId, depth = 2, limit = 50) {
  const nodes = new Map();
  const edges = [];
  if (!nodeExists(db, seedId)) return { seed: seedId, nodes: [], edges: [] };
  let frontier = [seedId];
  const seen = new Set([seedId]);
  for (let d = 0; d <= depth && frontier.length && nodes.size < limit; d++) {
    const next = [];
    for (const id of frontier) {
      if (nodes.size >= limit) break;
      const node = getNode(db, id);
      if (node) nodes.set(id, node);
      for (const nb of neighbors(db, id)) {
        edges.push({ source: id, target: nb.neighbor_id, relation: nb.relation });
        if (!seen.has(nb.neighbor_id)) {
          seen.add(nb.neighbor_id);
          next.push(nb.neighbor_id);
        }
      }
    }
    frontier = next;
  }
  // dedupe edges
  const edgeKey = new Set();
  const deduped = edges.filter(e => {
    const k = e.source < e.target ? `${e.source}|${e.target}|${e.relation}` : `${e.target}|${e.source}|${e.relation}`;
    if (edgeKey.has(k)) return false;
    edgeKey.add(k);
    return true;
  });
  return { seed: seedId, nodes: [...nodes.values()], edges: deduped };
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function renderNode(node, verbose = false) {
  const lines = [`[${node.id}] ${node.title}  (${node.type})`];
  const meta = [];
  if (node.tags) meta.push(`tags: ${node.tags}`);
  if (node.project) meta.push(`project: ${node.project}`);
  if (node.source) meta.push(`source: ${node.source}`);
  if (meta.length) lines.push(`  ${meta.join('  ·  ')}`);
  const body = (node.content || '').trim();
  if (body) lines.push(`  ${verbose ? body : body.slice(0, 200) + (body.length > 200 ? '…' : '')}`);
  return lines.join('\n');
}

function renderNeighbors(id, nbs) {
  if (!nbs.length) return `  (no links)`;
  return nbs.map(nb => `  └─[${nb.relation}] ${nb.title} (${nb.id})`).join('\n');
}

// ---------------------------------------------------------------------------
// Ingest: extract memory nodes from DSH session logs
// ---------------------------------------------------------------------------

function listSessionFiles(sessionId) {
  const out = [];
  if (!fs.existsSync(SESSIONS_DIR)) return out;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.jsonl.zstd') && (!sessionId || full.includes(sessionId))) {
        out.push(full);
      }
    }
  };
  walk(SESSIONS_DIR);
  return out;
}

function readSessionLog(file) {
  // zstd decompress via node:zstd? Not built-in; shell out to python with the
  // `zstandard` package (documented as an ingest-only extra dependency).
  // Pick the interpreter by platform: `python` on Windows, `python3` elsewhere.
  const { execFileSync } = require('node:child_process');
  const PY = process.env.MEM_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const script = `
import sys, zstandard, json
sys.stdout.reconfigure(encoding='utf-8')
dctx = zstandard.ZstdDecompressor()
chunks = []
with open(sys.argv[1],'rb') as f:
    r = dctx.stream_reader(f)
    while True:
        c = r.read(1<<20)
        if not c: break
        chunks.append(c)
sys.stdout.write(b''.join(chunks).decode('utf-8', errors='replace'))
`;
  try {
    return execFileSync(PY, ['-c', script, file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const msg = String((e && e.stderr) || (e && e.message) || e);
    if (/No module named|ModuleNotFoundError/.test(msg)) {
      console.error(`mem ingest: 缺少 python 依赖 zstandard，请运行: ${PY} -m pip install zstandard`);
    } else if (/ENOENT|not found/i.test(msg)) {
      console.error(`mem ingest: 未找到 ${PY} 命令（macOS/Linux 请确认已安装 python3，或设置 MEM_PYTHON 环境变量）`);
    } else {
      console.error(`mem ingest: 解压失败（${msg.split('\n')[0]}），已跳过 ${file}`);
    }
    return '';
  }
}

const STOPWORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','is','are','was','were',
  'be','been','this','that','these','those','it','its','at','by','from','as','not',
  'you','your','i','we','our','they','their','他','她','它','的','了','是','在','和','与',
  '有','我','你','们','这','那','就','也','都','而','及','等','被','把','对','于','并',
  '或','中','上','下','为','个','之','不','没','很','会','要','能','可','以','后','前',
  '请','让','帮','用','给','将','已','经','还','再','只','但','如','果','因','为','所',
]);

function tokenizeZh(text) {
  // crude CJK bigram tokenization + latin words
  const tokens = new Set();
  const cjk = text.match(/[\u4e00-\u9fff]+/g) || [];
  for (const chunk of cjk) {
    if (chunk.length >= 2) {
      for (let i = 0; i < chunk.length - 1; i++) {
        const bigram = chunk.slice(i, i + 2);
        if (!STOPWORDS.has(bigram)) tokens.add(bigram);
      }
    }
    if (chunk.length >= 2 && !STOPWORDS.has(chunk)) tokens.add(chunk);
  }
  const words = text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
  for (const w of words) if (!STOPWORDS.has(w)) tokens.add(w);
  return [...tokens];
}

/** Filter out harness-injected system noise from user-visible turns. */
function isNoiseText(text) {
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith('<system-reminder>') || t.startsWith('<available_skills>')) return true;
  if (t.startsWith('The available skill catalog changed')) return true;
  if (t.startsWith('The approval policy changed') && t.length < 120) return true;
  if (/^(Session resumed|This is a resumed)/.test(t)) return true;
  return false;
}

/** Deterministic id for one ingested Q/A turn — makes ingest idempotent. */
function turnNodeId(q) {
  const h = crypto.createHash('sha1').update(q.trim()).digest('hex').slice(0, 12);
  return `conv-${h}`;
}

// ---------------------------------------------------------------------------
// Error/lesson extraction
// ---------------------------------------------------------------------------

/** Failure signals inside a tool result text. */
const FAILURE_MARKERS = [
  '[exit code: 1]', '[exit code: 2]', 'exit code: 1', 'exit code: 2',
  'ModuleNotFoundError', 'SyntaxError', 'TypeError', 'ReferenceError',
  'Traceback (most recent call last)', 'EPERM', 'EACCES', 'ENOENT',
  'FullyQualifiedErrorId', 'sandbox: file access denied', 'command not found',
  'denied', 'invalid config', 'does not exist', 'Cannot find package',
  'no such file', 'failed to', 'unable to',
];

/** Correction signals in a USER message (the user telling the agent it erred).
 *  Require an explicit directive word; "错误/失败" alone is too generic (it
 *  appears in task descriptions). Exclude question-like or task-like openers. */
const CORRECTION_RE = /(不对|错了|不是这样|应该|不应该|别用|不要用|别这样|记住|注意|重新做|换个方式|搞错|弄错|改一下|修正|纠正|重来)/;
const TASK_OPENER_RE = /^(这个|那个|我|请|希望|需要|能否|能不能|可以|帮我|现在|接下来|继续|然后|另外|关于|我想)/;

/** Assistant self-correction signals (agent acknowledging a mistake). */
const SELF_CORRECT_RE = /(我之前|我刚才|我错了|我的失误|我的疏忽|抱歉|对不起|更正|实际上应该|不应该这样|正确(的)?做法是|改为|误以为|踩坑|这(是|个)失误)/;

/** Known tool names for lesson attribution. */
const KNOWN_TOOLS = ['officecli', 'pdfread', 'mem', 'python', 'node', 'git', 'npm', 'pnpm', 'pip', 'pwsh', 'powershell', 'bash', 'curl', 'Invoke-WebRequest', 'read_image', 'write', 'edit', 'grep', 'glob', 'web_search'];

/** Attribute a failure snippet to the most likely tool name. */
function attributeTool(snippet, fullText) {
  for (const t of KNOWN_TOOLS) {
    if (snippet.toLowerCase().includes(t.toLowerCase()) || fullText.toLowerCase().includes(t.toLowerCase())) return t;
  }
  return '工具';
}

/** Extract a compact failure line from tool output tail. */
function failureSnippet(text) {
  const t = text.trim();
  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (FAILURE_MARKERS.some(m => line.includes(m))) {
      const ctx = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
      return ctx.slice(0, 300);
    }
  }
  // fallback: first marker hit anywhere
  for (const m of FAILURE_MARKERS) {
    const idx = t.indexOf(m);
    if (idx >= 0) return t.slice(Math.max(0, idx - 120), idx + m.length + 80).replace(/\s+/g, ' ').slice(0, 300);
  }
  return '';
}

/** Lesson node id is deterministic on the failure signature. */
function lessonNodeId(sig) {
  const h = crypto.createHash('sha1').update(sig).digest('hex').slice(0, 12);
  return `lesson-${h}`;
}

/** Classify a failure snippet into a coarse error kind for aggregation. */
function errorKind(snippet, text) {
  const s = (snippet + ' ' + text).toLowerCase();
  if (s.includes('[exit code: 1]') || s.includes('exit code: 1')) return 'exit-1';
  if (s.includes('[exit code: 2]') || s.includes('exit code: 2')) return 'exit-2';
  if (s.includes('modulenotfound')) return 'module-missing';
  if (s.includes('syntaxerror')) return 'syntax-error';
  if (s.includes('typeerror')) return 'type-error';
  if (s.includes('referenceerror')) return 'reference-error';
  if (s.includes('traceback')) return 'python-traceback';
  if (s.includes('eprem') || s.includes('eacces')) return 'permission-denied';
  if (s.includes('enoent') || s.includes('no such file')) return 'file-missing';
  if (s.includes('denied') || s.includes('denial')) return 'denied';
  if (s.includes('not found') || s.includes('command not found')) return 'not-found';
  return 'other';
}

function ingestSession(file, db, dryRun) {
  const log = readSessionLog(file);
  if (!log) return { file, events: 0, nodes: 0, links: 0, skipped: true };
  const lines = log.split('\n').filter(Boolean);
  const sessionMeta = (() => {
    try { return JSON.parse(lines[0]); } catch { return {}; }
  })();
  const sessionId = sessionMeta.id || path.basename(path.dirname(file));
  const project = sessionMeta.cwd || '';
  const created = sessionMeta.createdAt || now();

  // session title from the latest session/title event
  let sessionTitle = '';
  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'session/title' && ev.data?.title) sessionTitle = ev.data.title;
  }

  // collect tool failures: [tool/result] containing failure markers, paired
  // with the tool name from the preceding assistant tool-call if available.
  const failures = [];
  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type !== 'tool/result') continue;
    try {
      const content = ev.data?.message?.content || [];
      let txt = '';
      for (const block of content) {
        for (const inner of (block?.content || [])) {
          if (inner?.type === 'text') txt += inner.text || '';
        }
      }
      // skip skill/instruction payloads — they contain schema keywords, not failures
      if (/^\s*<(skill_content|skill_resources|available_skills|system-reminder)/.test(txt)) continue;
      if (FAILURE_MARKERS.some(m => txt.includes(m))) {
        failures.push({ text: txt, time: ev.time || now() });
      }
    } catch { /* skip malformed */ }
  }

  // collect user corrections (short user messages that read like feedback)
  const corrections = [];
  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type !== 'user/message') continue;
    const content = ev.data?.content;
    const text = Array.isArray(content)
      ? content.filter(p => p?.type === 'text').map(p => p.text).join('\n')
      : (typeof content === 'string' ? content : '');
    if (!text.trim() || isNoiseText(text)) continue;
    if (CORRECTION_RE.test(text) && !TASK_OPENER_RE.test(text) && text.trim().length <= 200) {
      corrections.push({ text: text.trim(), time: ev.time || now() });
    }
  }

  // extract user messages and assistant text messages in order
  const turns = [];
  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'user/message') {
      const content = ev.data?.content;
      const text = Array.isArray(content)
        ? content.filter(p => p?.type === 'text').map(p => p.text).join('\n')
        : (typeof content === 'string' ? content : '');
      if (text.trim()) turns.push({ kind: 'user', text, time: ev.time || now() });
    } else if (ev.type === 'assistant/message') {
      const parts = ev.data?.message?.content;
      const text = Array.isArray(parts)
        ? parts.filter(p => p?.type === 'text').map(p => p.text).join('\n')
        : (typeof parts === 'string' ? parts : '');
      if (text.trim()) turns.push({ kind: 'assistant', text, time: ev.time || now() });
    }
  }

  // session node (idempotent by id)
  const sessionNodeId = `session-${sessionId.replace(/^session-/, '').slice(0, 8)}`;
  const title = sessionTitle || `会话 ${sessionId.slice(0, 8)}`;
  const sessionBody = `会话 ${sessionId}\n项目: ${project}\n创建: ${new Date(created).toISOString()}`;
  if (!dryRun) addNode(db, { id: sessionNodeId, title, content: sessionBody, type: 'session', project, source: file });

  // turn nodes: user question -> assistant answer merged as one node per turn
  let createdNodes = 0;
  let createdLinks = 0;
  let currentUser = null;
  const linkAll = (id, ids) => { for (const t of ids) if (t !== id) { if (linkNodes(db, id, t)) createdLinks++; } };

  for (const turn of turns) {
    if (turn.kind === 'user') {
      currentUser = { text: turn.text, time: turn.time };
    } else if (turn.kind === 'assistant' && currentUser) {
      const q = currentUser.text.trim();
      const a = turn.text.trim();
      currentUser = null;
      if (isNoiseText(q) || q.length < 4 || a.length < 8) continue;
      const nodeId = turnNodeId(q);
      const existed = !dryRun && nodeExists(db, nodeId);
      if (!dryRun) addNode(db, {
        id: nodeId,
        title: q.slice(0, 60),
        content: `Q: ${q.slice(0, 500)}\n\nA: ${a.slice(0, 4000)}`,
        type: 'conversation',
        tags: tokenizeZh(q + ' ' + a).slice(0, 12).join(','),
        project,
        source: file,
      });
      if (!dryRun) {
        if (!existed) createdNodes++;
        if (linkNodes(db, nodeId, sessionNodeId)) createdLinks++;
        // auto-link to existing nodes by shared tags/title tokens — deliberately
        // cross-project: the graph must connect knowledge across workspaces.
        const tokens = tokenizeZh(q + ' ' + a);
        const linked = new Set([sessionNodeId]);
        for (const tok of tokens.slice(0, 8)) {
          const hits = searchNodes(db, tok, 4);
          for (const h of hits) {
            if (!linked.has(h.id) && h.id !== nodeId) {
              linked.add(h.id);
              if (linkNodes(db, nodeId, h.id)) createdLinks++;
            }
          }
        }
      }
    }
  }
  // ── lesson nodes: auto-record mistakes so they are not repeated ──────────
  // 1) failed tool results → "what failed, how to avoid" lesson (aggregated by
  //    tool+error-kind so repeated failures update one node, not many)
  // 2) user corrections → lesson capturing the corrected expectation
  // 3) assistant self-correction turns → lesson from the acknowledged mistake
  let lessonsCreated = 0;
  const lessonSigs = new Set();

  const makeLesson = (sig, title, body, tags) => {
    const id = lessonNodeId(sig);
    if (lessonSigs.has(id)) return;
    lessonSigs.add(id);
    if (dryRun) return;
    const existed = nodeExists(db, id);
    if (existed) {
      // Same lesson seen again: bump the counter ONLY when this source file has
      // not already contributed to this lesson (keeps repeated ingest of one
      // session idempotent while still counting repeat failures across sessions).
      const cur = getNode(db, id);
      if (cur && cur.source === file) return; // already counted for this file
      const m = (cur?.content || '').match(/再次发生 (\d+) 次/);
      const count = m ? Number(m[1]) + 1 : 1;
      addNode(db, {
        id,
        title: cur?.title || title,
        content: `${cur?.content || body}\n\n（再次发生 ${count} 次 · ${path.basename(file)}）`,
        type: 'lesson',
        tags: cur?.tags || tags.join(','),
        project,
        source: cur?.source ? `${cur.source}\n${file}` : file,
      });
    } else {
      addNode(db, {
        id,
        title,
        content: body.slice(0, 3000),
        type: 'lesson',
        tags: tags.slice(0, 12).join(','),
        project,
        source: file,
      });
      lessonsCreated++;
    }
    if (linkNodes(db, id, sessionNodeId)) createdLinks++;
    // link to related existing nodes (the tool or conversation involved)
    const linked = new Set([sessionNodeId]);
    for (const tok of tokenizeZh(title + ' ' + body).slice(0, 6)) {
      for (const h of searchNodes(db, tok, 3)) {
        if (!linked.has(h.id) && h.id !== id) {
          linked.add(h.id);
          if (linkNodes(db, id, h.id)) createdLinks++;
        }
      }
    }
  };

  // tool failures — aggregated per tool + error kind
  for (const f of failures) {
    const snippet = failureSnippet(f.text);
    if (!snippet) continue;
    const toolName = attributeTool(snippet, f.text);
    const kind = errorKind(snippet, f.text);
    makeLesson(
      `tool:${toolName}:${kind}`,
      `教训:${toolName} ${kind}`,
      `工具调用失败（${toolName} · ${kind}）\n失败信息: ${snippet}\n\n避免方法: 先查工具帮助/语法再调用；失败后检查参数与路径，不要盲目重试。`,
      tokenizeZh(snippet).concat([toolName, '失败', '避坑']),
    );
  }

  // user corrections
  for (const c of corrections) {
    makeLesson(
      `user:${c.text.slice(0, 80)}`,
      `教训:${c.text.slice(0, 40)}`,
      `用户纠正: ${c.text}\n\n要求: 记住用户反馈，之后同类任务按此执行。`,
      tokenizeZh(c.text).concat(['用户反馈', '纠正']),
    );
  }

  // assistant self-corrections: a turn whose answer contains self-correction
  // language, anchored on the user question
  let userTurn = null;
  for (const turn of turns) {
    if (turn.kind === 'user') {
      userTurn = { text: turn.text, time: turn.time };
    } else if (turn.kind === 'assistant' && userTurn) {
      const q = userTurn.text.trim();
      const a = turn.text.trim();
      userTurn = null;
      if (isNoiseText(q) || q.length < 4 || a.length < 8) continue;
      const selfM = a.match(SELF_CORRECT_RE);
      if (selfM) {
        const anchor = a.slice(0, 400);
        makeLesson(
          `self:${q.slice(0, 60)}`,
          `教训:${q.slice(0, 36)}`,
          `问题: ${q.slice(0, 200)}\n\n过程中自我修正: ${anchor}\n\n避免方法: 同类任务一开始就采用修正后的做法。`,
          tokenizeZh(q + ' ' + anchor).concat(['自我修正', '避坑']),
        );
      }
    }
  }

  return { file, events: lines.length, nodes: createdNodes, links: createdLinks, lessons: lessonsCreated, skipped: false };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(argv, name, def) {
  const idx = argv.indexOf(name);
  if (idx === -1) return def;
  const next = argv[idx + 1];
  return next === undefined ? '' : next;
}

function flag(argv, name) {
  return argv.includes(name);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(`mem — persistent memory graph (SQLite + bidirectional links)

Usage:
  mem add <title> [--content TEXT] [--type TYPE] [--tags a,b,c] [--project P] [--link id,id] [--source S]
  mem get <id>
  mem search <query> [--limit N] [--project P] [--type T]
  mem graph <id> [--depth N] [--limit N]
  mem link <from> <to> [--relation R]
  mem unlink <from> <to>
  mem tags [--tag T]
  mem recent [--limit N]
  mem lessons [--search KW] [--limit N]
  mem stats
  mem ingest [--session ID | --all] [--dry-run]   # self-grow + auto lesson extraction
  mem export [--out FILE]

Data: ${DB_PATH}`);
    process.exit(0);
  }

  const db = openDb();

  switch (cmd) {
    case 'add': {
      const title = rest.find(a => !a.startsWith('--'));
      if (!title) { console.error('mem add: title required'); process.exit(1); }
      const id = addNode(db, {
        title,
        content: argValue(rest, '--content', ''),
        type: argValue(rest, '--type', 'note'),
        tags: argValue(rest, '--tags', ''),
        project: argValue(rest, '--project', ''),
        source: argValue(rest, '--source', ''),
        link: (argValue(rest, '--link', '') || '').split(',').map(s => s.trim()).filter(Boolean),
      });
      console.log(`added ${id}`);
      break;
    }
    case 'get': {
      const id = rest[0];
      const node = getNode(db, id);
      if (!node) { console.error(`mem get: no node ${id}`); process.exit(1); }
      console.log(renderNode(node, true));
      console.log(renderNeighbors(id, neighbors(db, id)));
      break;
    }
    case 'search': {
      const q = rest.find(a => !a.startsWith('--'));
      if (!q) { console.error('mem search: query required'); process.exit(1); }
      const limit = Number(argValue(rest, '--limit', '8'));
      const rows = searchNodes(db, q, limit, argValue(rest, '--project', ''), argValue(rest, '--type', ''));
      if (!rows.length) { console.log('(no results)'); break; }
      for (const row of rows) {
        console.log(renderNode(row));
        console.log(renderNeighbors(row.id, neighbors(db, row.id)));
        console.log('');
      }
      break;
    }
    case 'graph': {
      const id = rest[0];
      const depth = Number(argValue(rest, '--depth', '2'));
      const limit = Number(argValue(rest, '--limit', '50'));
      const g = graphBFS(db, id, depth, limit);
      if (!g.nodes.length) { console.error(`mem graph: no node ${id}`); process.exit(1); }
      const index = new Map(g.nodes.map(n => [n.id, n]));
      console.log(`graph seed=${id} depth=${depth} nodes=${g.nodes.length} edges=${g.edges.length}`);
      for (const edge of g.edges) {
        const s = index.get(edge.source)?.title || edge.source;
        const t = index.get(edge.target)?.title || edge.target;
        console.log(`  ${s} --[${edge.relation}]--> ${t}`);
      }
      console.log('');
      for (const n of g.nodes) console.log(renderNode(n));
      break;
    }
    case 'link': {
      const [from, to] = rest.filter(a => !a.startsWith('--'));
      if (!from || !to) { console.error('mem link: from and to required'); process.exit(1); }
      const ok = linkNodes(db, from, to, argValue(rest, '--relation', 'related'));
      console.log(ok ? `linked ${from} -> ${to}` : `link failed (missing node or duplicate)`);
      break;
    }
    case 'unlink': {
      const [from, to] = rest.filter(a => !a.startsWith('--'));
      const n = unlinkNodes(db, from, to);
      console.log(`removed ${n} link(s)`);
      break;
    }
    case 'tags': {
      const tag = argValue(rest, '--tag', '');
      const rows = tag
        ? db.prepare('SELECT * FROM nodes WHERE tags LIKE ? ORDER BY updated_at DESC LIMIT 50').all(`%${tag}%`)
        : db.prepare(`SELECT tags, COUNT(*) c FROM nodes WHERE tags != '' GROUP BY tags ORDER BY c DESC LIMIT 50`).all();
      if (tag) { for (const r of rows) console.log(renderNode(r)); }
      else { for (const r of rows) console.log(`${r.c}\t${r.tags}`); }
      break;
    }
    case 'recent': {
      const limit = Number(argValue(rest, '--limit', '10'));
      const rows = db.prepare('SELECT * FROM nodes ORDER BY updated_at DESC LIMIT ?').all(limit);
      for (const r of rows) console.log(renderNode(r));
      break;
    }
    case 'stats': {
      const nodes = db.prepare('SELECT COUNT(*) c FROM nodes').get().c;
      const links = db.prepare('SELECT COUNT(*) c FROM links').get().c;
      const byType = db.prepare('SELECT type, COUNT(*) c FROM nodes GROUP BY type ORDER BY c DESC').all();
      const byProject = db.prepare("SELECT project, COUNT(*) c FROM nodes WHERE project != '' GROUP BY project ORDER BY c DESC").all();
      console.log(`nodes: ${nodes}`);
      console.log(`links: ${links}`);
      console.log('types: ' + byType.map(r => `${r.type}(${r.c})`).join(', '));
      if (byProject.length) console.log('projects: ' + byProject.map(r => `${r.project}(${r.c})`).join(', '));
      break;
    }
    case 'ingest': {
      const session = argValue(rest, '--session', '');
      const all = flag(rest, '--all');
      const dry = flag(rest, '--dry-run');
      const files = all
        ? listSessionFiles('')
        : session ? listSessionFiles(session) : listSessionFiles('');
      // default: newest session only
      const targets = (all || session) ? files : files.slice(-1);
      let total = { nodes: 0, links: 0, lessons: 0, files: 0 };
      for (const f of targets) {
        const r = ingestSession(f, db, dry);
        if (r.skipped) { console.log(`skip  ${f} (unreadable)`); continue; }
        total.files++; total.nodes += r.nodes; total.links += r.links; total.lessons += r.lessons || 0;
        console.log(`ingest ${f}\n  events=${r.events} newNodes=${r.nodes} newLinks=${r.links} newLessons=${r.lessons || 0}`);
      }
      console.log(`\n${dry ? 'DRY RUN: ' : ''}ingested ${total.files} session(s), ${total.nodes} node(s), ${total.links} link(s), ${total.lessons} lesson(s)`);
      break;
    }
    case 'lessons': {
      // mistake log: lessons sorted by recency, optional keyword filter
      const kw = argValue(rest, '--search', '');
      const limit = Number(argValue(rest, '--limit', '20'));
      let rows;
      if (kw) {
        rows = searchNodes(db, kw, limit, '', 'lesson');
      } else {
        rows = db.prepare("SELECT * FROM nodes WHERE type='lesson' ORDER BY updated_at DESC LIMIT ?").all(limit);
      }
      if (!rows.length) { console.log('(no lessons yet)'); break; }
      console.log(`lessons: ${rows.length}`);
      for (const row of rows) {
        console.log(renderNode(row));
        console.log(renderNeighbors(row.id, neighbors(db, row.id)));
        console.log('');
      }
      break;
    }
    case 'export': {
      const out = argValue(rest, '--out', '');
      const nodes = db.prepare('SELECT * FROM nodes').all();
      const links = db.prepare('SELECT * FROM links').all();
      const data = JSON.stringify({ exportedAt: new Date().toISOString(), nodes, links }, null, 2);
      if (out) { fs.writeFileSync(out, data, 'utf8'); console.log(`exported ${nodes.length} nodes, ${links.length} links -> ${out}`); }
      else console.log(data);
      break;
    }
    default:
      console.error(`mem: unknown command "${cmd}" (try "mem help")`);
      process.exit(1);
  }

  db.close();
}

main();
