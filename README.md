# 🔬 DeepSeek Harness 科研工作站模板

> 基于 DeepSeek Harness (DSH) 的端到端 AI 辅助科研工作流模板。
> **开箱即用** — 一键安装 Agent 预设，选择「科研工作站」即可开始科研。

---

## 📦 快速开始

### 1. 安装 DeepSeek Harness

从 [DeepSeek Harness 官网](https://deepseek.com/harness) 下载并安装桌面版。

### 2. 安装科研工作站预设（一键）

将本仓库解压后，在仓库根目录运行安装脚本：

**Windows（PowerShell）：**
```powershell
.\install-windows.ps1
```

**macOS / Linux：**
```bash
chmod +x install-macos-linux.sh && ./install-macos-linux.sh
```

脚本会：
1. 把 `preset/`（`agent.cordis.yml` + `preset.yml` + 19 个技能）复制到
   `~/.dsh/.agent-presets/research/`，注册为 DSH 的「科研工作站」预设；
2. 把 `tools/` 里的辅助工具（`mem` 记忆图谱、`pdfread` PDF 读取）安装到
   `~/bin`（需 Node ≥ 22.13 与 Python ≥ 3.9；`pip install pymupdf pdfplumber`；
   `mem ingest` 另需 `pip install zstandard`）；
3. 提示可选安装第三方 `officecli`（Word/Excel/PPT 自动化，见下）。

> 只想要预设、不要工具：`.\install-windows.ps1 -SkipTools` / `./install-macos-linux.sh --skip-tools`

### 3. 启动科研会话

打开 DSH → 新建会话 → 选择预设 **「科研工作站」(research)**，然后：

```
"帮我创建一个新项目：基于深度学习的蛋白质结构预测"
"开始文献综述，检索最新的Transformer架构在蛋白质折叠中的应用"
"设计实验方案，对比ESMFold和AlphaFold3的预测精度"
```

### 4. 激活科研数据目录（可选但推荐）

将本仓库的 `.dsh-research/` 目录复制到你的 DSH 工作目录下，科研助手就会用它
作为结构化的研究状态注册表：

```
你的工作目录/
├── .dsh-research/          # ← 复制此目录
├── ... (你的其他文件)
```

---

## 🗂️ 仓库结构

```
DSH-Research-Workstation-Template/
├── preset/                 # Agent 预设本体（安装脚本复制到 ~/.dsh/.agent-presets/research/）
│   ├── agent.cordis.yml    # 预设组合：persona + 全部标准能力 + 技能目录
│   ├── preset.yml          # 预设元数据（名称/描述）
│   └── skills/             # 19 个技能（16 个科研技能 + officecli/pdf-reading/memory-network）
├── tools/                  # 随包辅助工具（mem 记忆图谱、pdfread PDF 读取）
├── .dsh-research/          # 科研数据注册表模板（复制到工作目录使用）
├── install-windows.ps1     # Windows 一键安装
├── install-macos-linux.sh  # macOS/Linux 一键安装
├── README.md / README_EN.md / QUICKSTART.md
├── CHANGELOG.md            # 版本变更记录
├── CONTRIBUTING.md         # 贡献指南
├── CODE_OF_CONDUCT.md      # 行为准则
├── SECURITY.md             # 安全策略
└── LICENSE                 # MIT
```

### `.dsh-research/` 各文件说明

| 文件 | 用途 | 核心字段 |
|------|------|---------|
| `projects.json` | 科研项目管理 | id, name, description, status, field |
| `papers.json` | 文献检索与阅读记录 | id, title, authors, doi, abstract, keywords |
| `notes.json` | 研究笔记（文献/方法/分析） | id, title, content, tags, type |
| `methods.json` | 研究方法设计 | id, name, paradigm, strategy, data_collection |
| `experiments.json` | 实验方案与结果 | id, name, hypothesis, protocol, results |
| `data.json` | 数据集管理 | id, name, type, file_path, variables |
| `analysis.json` | 数据分析记录 | id, name, method, results, interpretation |
| `drafts.json` | 论文撰写草稿 | id, title, sections, target_journal |
| `citations.json` | 参考文献库 | id, title, authors, doi, type |
| `reports.json` | 研究报告索引 | id, title, file_path |

---

## 🧪 支持的科研范式

- **自然科学**：实验设计、定量分析、假设检验、可复现研究
- **社会科学**：调查、案例研究、扎根理论、混合方法
- **跨学科**：计算社会科学、网络分析、文本挖掘

## 📊 可用统计方法

匹配 SPSS/R 算法标准：
- 描述统计、t检验、ANOVA、回归分析
- 非参数检验、卡方检验、效应量、置信区间
- 结构方程模型(SEM)、多层线性模型(HLM)
- 元分析、生存分析、聚类分析
- 项目反应理论(IRT)、心理测量学分析
- 质性分析、主题分析、扎根理论编码

## 📚 引用格式支持

- APA 7th / MLA 9th / Chicago (Author-Date & Notes-Bibliography) / GB/T 7714

---

## 🧠 内置技能库

安装预设后，通过 `skill` 命令加载，提供分领域深度指导（每个技能含决策表、
公式、代码示例、陷阱清单）：

| 技能 | 领域 |
|------|------|
| `research-methodology` | 研究方法论 |
| `statistical-analysis` | 统计分析（SPSS对标） |
| `paper-writing` | 学术论文写作 |
| `frontier-research` | 前沿科学/开放科学 |
| `academic-apis` | 学术数据库API |
| `fsqca` | 模糊集定性比较分析 |
| `sem` | 结构方程模型 |
| `meta-analysis` | 元分析 |
| `experimental-design` | 实验设计 |
| `survival-analysis` | 生存分析 |
| `multilevel-modeling` | 多层线性模型 |
| `network-analysis` | 网络分析 |
| `item-response-theory` | 项目反应理论 |
| `grounded-theory` | 扎根理论 |
| `nlp-text-mining` | 文本挖掘 |
| `machine-learning-research` | 机器学习研究 |
| `officecli` | Office 文档操控（可选工具） |
| `pdf-reading` | PDF 读取（可选工具） |
| `memory-network` | 跨会话记忆图谱（可选工具） |

## 🛠️ 可选工具

| 工具 | 作用 | 安装 |
|------|------|------|
| `mem` | 跨工作区/会话的持久记忆图谱（SQLite，零依赖） | 随包安装（需 Node ≥ 22.13；`ingest` 另需 Python + zstandard） |
| `pdfread` | PDF 文本/表格/元数据/页面渲染读取 | 随包安装（需 Python ≥ 3.9 + pymupdf/pdfplumber） |
| `officecli` | Word/Excel/PPT 读写编辑（第三方开源） | `irm https://d.officecli.ai/install.ps1 \| iex`（Win）/ `curl -fsSL https://d.officecli.ai/install.sh \| bash`（macOS/Linux） |

---

## 🔄 完整科研工作流

```
选题与文献综述 ──> 研究方法设计 ──> 数据收集 ──> 数据分析 ──> 论文撰写
     │                    │              │             │             │
     ▼                    ▼              ▼             ▼             ▼
 projects.json      methods.json    data.json    analysis.json   drafts.json
 papers.json        experiments.json                          citations.json
 notes.json                                                    reports.json
```

---

## 🌍 开放科学实践

- **预注册**：研究方案可预先在 projects.json 中注册
- **开放数据**：data.json 支持关联公开数据集
- **可复现**：analysis.json 记录完整分析代码和参数
- **预印本**：支持 arXiv 等预印本检索与引用

---

## 📄 许可证

MIT License — 自由使用、修改和分发。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 改进这个科研模板！
