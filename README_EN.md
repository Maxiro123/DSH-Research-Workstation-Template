# 🔬 DeepSeek Harness Research Workstation Template

> An end-to-end AI-assisted research workflow template powered by DeepSeek Harness (DSH).
> **Ready out of the box** — one-command install, then pick the "科研工作站" (Research Workstation) preset.

---

## 📦 Quick Start

### 1. Install DeepSeek Harness

Download and install the desktop version from the [DeepSeek Harness website](https://deepseek.com/harness).

### 2. Install the Research Workstation preset (one command)

Unzip this repository, then run the installer from the repository root:

**Windows (PowerShell):**
```powershell
.\install-windows.ps1
```

**macOS / Linux:**
```bash
chmod +x install-macos-linux.sh && ./install-macos-linux.sh
```

The script will:
1. Copy `preset/` (`agent.cordis.yml` + `preset.yml` + 19 skills) to
   `~/.dsh/.agent-presets/research/`, registering the "Research Workstation" preset in DSH;
2. Install the bundled helper tools (`mem` memory graph, `pdfread` PDF reader) into
   `~/bin` (requires Node ≥ 22.13 and Python ≥ 3.9 with `pip install pymupdf pdfplumber`;
   `mem ingest` additionally needs `pip install zstandard`);
3. Show the optional third-party `officecli` install command (Word/Excel/PPT automation).

> Preset only, no tools: `.\install-windows.ps1 -SkipTools` / `./install-macos-linux.sh --skip-tools`

### 3. Start a research session

Open DSH → New Session → choose the **「科研工作站」(research)** preset, then:

```
"Create a new project: protein structure prediction using deep learning"
"Start a literature review on transformer architectures for protein folding"
"Design an experiment comparing ESMFold and AlphaFold3 prediction accuracy"
```

### 4. Activate the research data directory (optional but recommended)

Copy this repository's `.dsh-research/` folder into your DSH working directory —
the research assistant will use it as the structured research-state registry:

```
your-workspace/
├── .dsh-research/          # ← Copy this directory
├── ... (your other files)
```

---

## 🗂️ Repository Layout

```
DSH-Research-Workstation-Template/
├── preset/                 # The agent preset itself (installer copies it to ~/.dsh/.agent-presets/research/)
│   ├── agent.cordis.yml    # Preset composition: persona + full standard capabilities + skills dir
│   ├── preset.yml          # Preset metadata (name/description)
│   └── skills/             # 19 skills (16 research + officecli/pdf-reading/memory-network)
├── tools/                  # Bundled helper tools (mem memory graph, pdfread PDF reader)
├── .dsh-research/          # Research data-registry template (copy into a working directory)
├── install-windows.ps1     # Windows one-command installer
├── install-macos-linux.sh  # macOS/Linux one-command installer
├── README.md / README_EN.md / QUICKSTART.md
├── CHANGELOG.md            # Version history
├── CONTRIBUTING.md         # Contribution guide
├── CODE_OF_CONDUCT.md      # Code of conduct
├── SECURITY.md             # Security policy
└── LICENSE                 # MIT
```

### File Specifications (`.dsh-research/`)

| File | Purpose | Key Fields |
|------|---------|------------|
| `projects.json` | Research project management | id, name, description, status, field |
| `papers.json` | Literature search & reading records | id, title, authors, doi, abstract, keywords |
| `notes.json` | Research notes (lit/method/analysis) | id, title, content, tags, type |
| `methods.json` | Research method design | id, name, paradigm, strategy, data_collection |
| `experiments.json` | Experiment protocols & results | id, name, hypothesis, protocol, results |
| `data.json` | Dataset management | id, name, type, file_path, variables |
| `analysis.json` | Data analysis records | id, name, method, results, interpretation |
| `drafts.json` | Paper writing drafts | id, title, sections, target_journal |
| `citations.json` | Reference library | id, title, authors, doi, type |
| `reports.json` | Research report index | id, title, file_path |

---

## 🧪 Supported Research Paradigms

- **Natural Sciences**: Experimental design, quantitative analysis, hypothesis testing, reproducible research
- **Social Sciences**: Surveys, case studies, grounded theory, mixed methods
- **Interdisciplinary**: Computational social science, network analysis, text mining

## 📊 Available Statistical Methods

SPSS/R-aligned algorithms:
- Descriptive statistics, t-tests, ANOVA, regression analysis
- Non-parametric tests, chi-square tests, effect sizes, confidence intervals
- Structural Equation Modeling (SEM), Hierarchical Linear Modeling (HLM)
- Meta-analysis, survival analysis, cluster analysis
- Item Response Theory (IRT), psychometric analysis
- Qualitative analysis, thematic coding, grounded theory coding

## 📚 Citation Format Support

- APA 7th / MLA 9th / Chicago (Author-Date & Notes-Bibliography) / GB/T 7714

---

## 🧠 Built-in Skill Library

Loaded via the `skill` command after installing the preset. Each skill contains
decision tables, formulas, code examples, and pitfall checklists:

| Skill | Domain |
|-------|--------|
| `research-methodology` | Research methodology |
| `statistical-analysis` | Statistical analysis (SPSS-aligned) |
| `paper-writing` | Academic writing |
| `frontier-research` | Open science & frontier research |
| `academic-apis` | Academic database APIs |
| `fsqca` | Fuzzy-set Qualitative Comparative Analysis |
| `sem` | Structural Equation Modeling |
| `meta-analysis` | Meta-analysis |
| `experimental-design` | Experimental design |
| `survival-analysis` | Survival analysis |
| `multilevel-modeling` | Hierarchical Linear Modeling |
| `network-analysis` | Network analysis |
| `item-response-theory` | Item Response Theory |
| `grounded-theory` | Grounded theory |
| `nlp-text-mining` | Text mining |
| `machine-learning-research` | Machine learning research |
| `officecli` | Office document automation (optional tool) |
| `pdf-reading` | PDF reading (optional tool) |
| `memory-network` | Cross-session memory graph (optional tool) |

## 🛠️ Optional Tools

| Tool | Purpose | Install |
|------|---------|---------|
| `mem` | Persistent memory graph across workspaces/sessions (SQLite, zero deps) | Bundled (needs Node ≥ 22.13; `ingest` also needs Python + zstandard) |
| `pdfread` | PDF text/tables/metadata/page renders | Bundled (needs Python ≥ 3.9 + pymupdf/pdfplumber) |
| `officecli` | Word/Excel/PPT read/edit automation (third-party, open source) | `irm https://d.officecli.ai/install.ps1 \| iex` (Win) / `curl -fsSL https://d.officecli.ai/install.sh \| bash` (macOS/Linux) |

---

## 🔄 Complete Research Workflow

```
Topic Selection & Lit Review ──> Method Design ──> Data Collection ──> Data Analysis ──> Paper Writing
         │                            │                    │                   │                   │
         ▼                            ▼                    ▼                   ▼                   ▼
   projects.json               methods.json           data.json         analysis.json        drafts.json
   papers.json                 experiments.json                                              citations.json
   notes.json                                                                                 reports.json
```

---

## 🌍 Open Science Practices

- **Pre-registration**: Register research protocols in advance via projects.json
- **Open Data**: Link public datasets through data.json
- **Reproducibility**: Record complete analysis code and parameters in analysis.json
- **Preprints**: Search and cite arXiv and other preprint servers

---

## 📄 License

MIT License — free to use, modify, and distribute.

## 🤝 Contributing

Issues and Pull Requests to improve this research template are welcome!
