---
name: memory-network
description: Persistent cross-project memory graph with Obsidian-style linked nodes. Use to remember important facts, decisions, mistakes/lessons, and learnings across sessions/workspaces, and to retrieve prior knowledge on demand by following node links. Commands: mem add / get / search / graph / link / lessons / ingest / stats.
---

# memory-network

A persistent, self-growing knowledge graph stored in SQLite at
`~/.dsh/memory/memory.db`, invoked through the `mem` CLI. Install `mem`
first: copy `tools/mem.cmd` and `tools/mem.js` from this project into a
directory on your PATH (or run the project's `install-windows.ps1` / `install-macos-linux.sh`, which does it for you). It works from ANY workspace and ANY session —
nothing is injected into the context; you query it only when needed.

## Core model

- **nodes**: titled memory entries with `type` (note | tool | session | conversation | lesson | decision | project | ...), `content`, `tags`, `project` (workspace path), `source`.
- **links**: bidirectional edges between nodes (Obsidian-style `[[links]]`), each with a `relation` (default `related`).
- **lessons**: `type=lesson` nodes record mistakes automatically — failed tool calls, user corrections, and self-corrections. They are aggregated per (tool, error-kind) and idempotent.
- Search: SQLite FTS5 (trigram, works for Chinese/English) + LIKE fallback.
- Graph traversal: BFS along links — this is how you "walk" the memory network instead of dumping everything into context.

## Commands

```powershell
mem add <title> --content "..." --type tool --tags "office,cli" --project "proj" --link conv-abc123,node-xyz   # remember; --link auto-links
mem get <id>                                    # full node + one-hop neighbors
mem search <query> [--limit N] [--project P] [--type T]   # fuzzy full-text
mem graph <id> [--depth N] [--limit N]          # BFS along links (the "recall" tool)
mem link <from> <to> [--relation R]             # manual link
mem unlink <from> <to>
mem tags [--tag T]                              # browse by tag
mem recent [--limit N]                          # recently updated
mem lessons [--search KW] [--limit N]           # mistake log: what to avoid
mem stats                                       # graph size overview
mem ingest [--session ID | --all] [--dry-run]   # self-grow + auto lesson extraction
mem export [--out FILE]                         # JSON dump of the whole graph
```

## When to use

### Before starting a task (avoid past mistakes)
1. **Check lessons first**: `mem lessons --search <task-keywords>` (or `mem search <kw> --type lesson`) — this is the anti-repeat mechanism. If a matching lesson exists, follow its "避免方法" from the start instead of repeating the mistake.
2. **Recall context**: `mem search <topic>` for seeds, then `mem graph <seed> --depth 2` to walk the neighborhood — gives related context without dumping the whole memory.

### During / after work
- **Remember** (`mem add`): when the user states a durable fact, a decision, a preference, an installed tool/package, a completed setup, a project structure, or anything another session would need later. Prefer a concise title, a short content block, and a few tags. Pass `--link` to connect to related existing nodes (look up their ids with `mem search` first).
- **When you catch yourself making a mistake or correcting course**: add it explicitly with `mem add <title> --type lesson --content "错误: ... 避免方法: ..."` so the next session learns from it immediately (ingest will also pick it up automatically later).
- **Self-grow** (`mem ingest`): run at the end of a session to fold its Q/A turns into the graph and auto-extract lessons from failed tool calls, user corrections, and self-corrections. It is idempotent (same question → same node id; same lesson → same `lesson-<sha1>` id), filters harness noise, and auto-links to the session node and similar nodes. Use `--dry-run` first to preview. **Requirement**: `ingest` needs Python 3 with `pip install zstandard` (to decompress `.jsonl.zstd` session logs); the interpreter is `python` on Windows / `python3` elsewhere, overridable via `MEM_PYTHON`. Without it, `ingest` prints a hint and skips.

## Notes

- IDs are stable: manual nodes use slugified titles + suffix; ingested turns use `conv-<sha1>`; lessons use `lesson-<sha1>` (aggregated per tool+error-kind); sessions use `session-<id8>`.
- Lesson aggregation: repeated failures of the same tool+kind update one lesson node and increment its occurrence counter; re-ingesting the same session does not double-count.
- Do not dump the whole graph into the conversation; always scope with `--limit`, `--project`, `--type`, or BFS depth.
- The database is plain SQLite (WAL mode); you may also inspect it directly with any SQLite tool.
- Never edit files under the DSH deployment itself (host composition, node_modules, shipped presets) — this memory system intentionally lives outside the harness and must stay that way.
