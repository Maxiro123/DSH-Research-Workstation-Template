# Contributing to DSH Research Workstation Template

欢迎贡献！无论是修复 bug、改进技能文档、增加科研方法技能，还是完善安装脚本。

## 开发流程

1. **Fork** 本仓库并克隆到本地。
2. 创建功能分支：`git checkout -b feat/your-change`。
3. 做出修改，并确保：
   - `preset/` 下的修改保持 DSH 组合规范（服务行必须放在带 `isolate` realm 的 group 内）。
   - 新增技能时：目录名即技能名，含 `SKILL.md`，frontmatter 为 `---` / `name` / `description` / `---`，正文含决策表、公式、代码示例与陷阱清单。
   - 工具脚本修改后通过语法检查（`node --check` / `python -m py_compile`）。
   - 安装脚本修改后分别在 Windows PowerShell 与 bash 下冒烟测试。
4. 提交并推送，然后发起 Pull Request，描述改动动机与验证方式。

## 提交信息规范

- `fix:` — bug 修复（如 `fix: resolve readlink portability on macOS`）
- `feat:` — 新功能（如 `feat: add survival-analysis skill`）
- `docs:` — 文档（如 `docs: clarify Node version requirement`）
- `chore:` — 杂项（如 `chore: add .gitignore`）

## 版本声明

当前依赖版本要求（修改时请同步更新 README、README_EN、QUICKSTART 与 tools/README.md）：

- Node ≥ 22.13（`mem`；22.5–22.12 需 `--experimental-sqlite`）
- Python ≥ 3.9（`pdfread`；`pymupdf>=1.24` + `pdfplumber`）
- Python + `zstandard`（`mem ingest` 可选）

## 行为准则

参与本项目即视为遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
