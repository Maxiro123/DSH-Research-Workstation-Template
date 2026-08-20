#!/usr/bin/env bash
# Install the "research" (科研工作站) agent preset into DeepSeek Harness (DSH).
#
# Usage:
#   ./install-macos-linux.sh            # preset + bundled tools
#   ./install-macos-linux.sh --skip-tools
#
# After install: open DSH, create a new session, pick "科研工作站".
set -euo pipefail
trap 'echo "ERROR: 安装失败（脚本行 $LINENO），请查看上方错误信息。" >&2; exit 1' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRESET_SRC="$SCRIPT_DIR/preset"
TOOLS_SRC="$SCRIPT_DIR/tools"

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PRESET_ROOT="$DSH_HOME/.agent-presets"
PRESET_DST="$PRESET_ROOT/research"

SKIP_TOOLS=0
if [[ "${1:-}" == "--skip-tools" ]]; then SKIP_TOOLS=1; fi

echo "==> Installing 'research' preset to $PRESET_DST"
if [[ ! -d "$PRESET_SRC" ]]; then
  echo "ERROR: preset directory not found: $PRESET_SRC" >&2
  exit 1
fi
mkdir -p "$PRESET_ROOT"
if [[ -e "$PRESET_DST" ]]; then
  echo "    Existing preset found at $PRESET_DST — overwriting."
  rm -rf "$PRESET_DST"
fi
mkdir -p "$PRESET_DST"
cp -R "$PRESET_SRC/." "$PRESET_DST"
if [[ -d "$PRESET_DST/skills" ]]; then
  SKILL_COUNT=$(find "$PRESET_DST/skills" -name 'SKILL.md' | wc -l | tr -d ' ')
else
  SKILL_COUNT=0
fi
echo "    OK: $SKILL_COUNT skills installed."

if [[ "$SKIP_TOOLS" -eq 0 ]]; then
  TOOL_DIR="${TOOL_DIR:-$HOME/bin}"
  echo "==> Installing bundled tools to $TOOL_DIR"
  if [[ "$(cd "$TOOL_DIR" 2>/dev/null && pwd)" == "$(cd "$TOOLS_SRC" && pwd)" ]]; then
    echo "ERROR: TOOL_DIR cannot be the repository's own tools directory." >&2
    exit 1
  fi
  mkdir -p "$TOOL_DIR"
  cp "$TOOLS_SRC/mem.js" "$TOOLS_SRC/pdfread.py" "$TOOL_DIR/"
  # POSIX shim launchers (the .cmd files are Windows-only).
  # Portable script-dir resolution: `readlink -f` does not exist on macOS
  # (BSD readlink), so resolve via cd/pwd instead.
  cat > "$TOOL_DIR/mem" <<'EOF'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/mem.js" "$@"
EOF
  cat > "$TOOL_DIR/pdfread" <<'EOF'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$DIR/pdfread.py" "$@"
EOF
  chmod +x "$TOOL_DIR/mem" "$TOOL_DIR/pdfread" "$TOOL_DIR/mem.js" "$TOOL_DIR/pdfread.py"
  echo "    OK: mem + pdfread installed."
  case ":$PATH:" in
    *":$TOOL_DIR:"*) ;;
    *) echo "    NOTE: $TOOL_DIR is not on your PATH. Add it or run with TOOL_DIR set to a PATH directory." ;;
  esac

  # Dependency checks so tools fail loudly at install time, not at first use.
  if command -v node >/dev/null 2>&1; then
    if node -e "require('node:sqlite')" >/dev/null 2>&1; then
      echo "    OK: node $(node -v) (supports node:sqlite)"
    else
      echo "    WARNING: node $(node -v) 过旧，mem 需要 Node >= 22.13（或 23.4+）。" >&2
    fi
  else
    echo "    WARNING: PATH 中未找到 node，mem 无法运行（需要 Node >= 22.13）。" >&2
  fi
  if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import fitz, pdfplumber" >/dev/null 2>&1; then
      echo "    OK: python3 + pymupdf/pdfplumber 已就绪"
    else
      echo "    WARNING: 缺少 pymupdf/pdfplumber，请执行: python3 -m pip install pymupdf pdfplumber" >&2
    fi
  else
    echo "    WARNING: PATH 中未找到 python3，pdfread 无法运行。" >&2
  fi
fi

if command -v officecli >/dev/null 2>&1; then
  echo "==> officecli 已安装，跳过可选提示。"
else
  echo "==> Optional: officecli (third-party, for .docx/.xlsx/.pptx automation)"
  echo "    Install with:  curl -fsSL https://d.officecli.ai/install.sh | bash"
fi

echo ""
echo "Done! Open DSH -> New Session -> choose preset 科研工作站 (research)."
echo "Optional: copy the .dsh-research/ folder into your working directory to activate the structured research registry."
