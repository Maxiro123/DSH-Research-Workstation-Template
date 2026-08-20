# tools/ 随包工具

本目录是两个可选的本地辅助工具，由根目录安装脚本（`install-windows.ps1` /
`install-macos-linux.sh`）自动安装到 PATH 目录。也可以手动复制。

| 工具 | 作用 | 系统要求 | 手动安装 |
|------|------|---------|---------|
| `mem.js` + `mem.cmd` | 跨工作区/会话的持久记忆图谱（SQLite，Obsidian 式双向链接） | **Node ≥ 22.13**（22.5–22.12 需 `--experimental-sqlite` 启动；零 npm 依赖） | Windows: 复制 `mem.cmd`+`mem.js` 到 PATH 目录；macOS/Linux: `node mem.js` |
| `mem ingest`（可选子命令） | 把 DSH 会话日志折入记忆图谱 | 另需 **Python 3 + `pip install zstandard`**（用于解压 `.jsonl.zstd` 会话日志） | — |
| `pdfread.py` + `pdfread.cmd` | PDF 文本/表格/元数据/页面渲染读取 | **Python ≥ 3.9 + `pip install "pymupdf>=1.24" pdfplumber`** | Windows: 复制 `pdfread.cmd`+`pdfread.py` 到 PATH 目录；macOS/Linux: `python3 pdfread.py` |

## 说明

- 数据目录遵循 `DSH_HOME` 环境变量（默认 `~/.dsh`），无硬编码路径。
- 纯本地运行，无任何网络调用。
- `mem` 的解释器可用 `MEM_PYTHON` 环境变量覆盖（默认 Windows 用 `python`，macOS/Linux 用 `python3`）。
- 加载 `memory-network` / `pdf-reading` 技能可获得完整用法指导。
