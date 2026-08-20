# ⚡ DSH 科研工作站 — 快速入门

## 1分钟上手

```powershell
# 1. 解压本仓库
# 2. 一键安装预设（Windows）
.\install-windows.ps1
#    macOS/Linux: chmod +x install-macos-linux.sh && ./install-macos-linux.sh

# 3. 打开 DSH，新建会话，选择「科研工作站」预设
# 4. （推荐）把 .dsh-research/ 复制到你的工作目录
# 5. 开始对话！
```

示例指令：
```
"创建一个新的科研项目，研究...（你的课题）"
"帮我做文献综述，检索最新论文"
"设计实验方案并开始分析"
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `skill research-methodology` | 加载研究方法论指导 |
| `skill statistical-analysis` | 加载统计分析指导 |
| `skill paper-writing` | 加载论文写作指导 |
| `skill sem` / `skill meta-analysis` | 加载 SEM / 元分析指导 |
| `subagent "..."` | 委托子任务 |
| `web_search "..."` | 学术文献检索 |
| `pwsh "..."` | 数据分析（Python/R） |

## 数据文件速查

| 文件 | 何时使用 |
|------|---------|
| `projects.json` | 创建/管理项目时 |
| `papers.json` | 检索到新论文时 |
| `notes.json` | 记录阅读笔记时 |
| `methods.json` | 设计研究方法时 |
| `experiments.json` | 设计/运行实验时 |
| `data.json` | 收集/导入数据时 |
| `analysis.json` | 完成分析时 |
| `drafts.json` | 撰写论文时 |
| `citations.json` | 管理参考文献时 |
| `reports.json` | 生成报告时 |

## 环境要求

- DeepSeek Harness 桌面版（[官网](https://deepseek.com/harness)）
- 可选：Node ≥ 22.13（`mem` 记忆工具）
- 可选：Python ≥ 3.9 + `pip install pymupdf pdfplumber`（`pdfread` PDF 工具；`mem ingest` 另需 `pip install zstandard`）
- 可选：officecli（第三方，安装命令见 README）

## 更多信息

详见 `README.md`（中文）或 `README_EN.md`（English）。
