# Changelog

本项目按 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式维护，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

## [0.1.1] - 2026-08-22

### 修复
- `install-windows.ps1`：修复 Windows PowerShell 5.1 下依赖检测命令失败（stderr 输出）被 `$ErrorActionPreference='Stop'` 提升为致命错误、导致安装中断并以退出码 1 退出的问题（探测改为局部 `Continue` 作用域，仅按退出码判定；缺失依赖时正确输出 WARNING 而不是崩溃）。
- `install-windows.ps1`：修复中文 Windows PowerShell 5.1 下脚本被按 ANSI 解析导致的中文乱码（文件改为 UTF-8 with BOM）。
- `install-macos-linux.sh`：修复生成的 mem/pdfread shim 使用 `readlink -f` 导致 macOS 上 100% 启动失败的问题（改为可移植的 cd/pwd 定位）。
- `tools/mem.js`：`node:sqlite` 加载失败时给出友好报错与版本要求；`mem ingest` 的 Python 调用改为按平台选择 `python`/`python3`（可用 `MEM_PYTHON` 覆盖），缺少 `zstandard` 时给出明确提示；删除未使用的 `node:zlib` 导入。
- `tools/pdfread.py`：依赖缺失时给出 pip 安装提示；兼容 PyMuPDF < 1.24 的 `fitz` 模块名；`--pages` 非法输入给出明确报错。

### 变更
- 安装脚本重命名：`install.ps1` → `install-windows.ps1`，`install.sh` → `install-macos-linux.sh`。
- 依赖版本声明统一为 Node ≥ 22.13、Python ≥ 3.9（`pymupdf>=1.24`）。
- 安装脚本新增运行环境依赖检测（node:sqlite、pymupdf/pdfplumber）与失败指引。
- `mem ingest` 的 zstandard 依赖已写入 README / tools/README / memory-network 技能。

### 新增
- `tools/README.md`：随包工具的系统要求与手动安装说明。
- 开源规范文件：`.gitignore`、`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`。
- 科研工作站预设 `research`（19 个技能：16 个科研技能 + officecli/pdf-reading/memory-network）。

## [0.1.0] - 2026-08-20

### 新增
- 初始版本：科研工作站模板（`.dsh-research/` 数据注册表 + README 三件套）。
