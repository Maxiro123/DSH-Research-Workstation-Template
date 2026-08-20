---
name: academic-apis
description: 当需要通过程序化接口检索学术文献（知网、Web of Science、Scopus、Google Scholar、arXiv、PubMed、Crossref、Semantic Scholar、OpenAlex 等）或处理 RIS/BibTeX 文献导出格式时，使用本技能选择正确的 API 并合规使用。
---

# academic-apis

## 何时使用本技能

- 需要批量检索、导出或去重学术文献，人工点击网页不可行
- 需要元数据（标题、作者、DOI、引用数、全文链接）构建文献数据库
- 需要把检索结果转为 RIS/BibTeX 供 Zotero/EndNote/LaTeX 使用
- 需要评估各数据库 API 的可用性、限速与合规边界
- 不适合：一次性查几篇文献（直接网页检索更快）；需要知网全文下载（受版权限制，通常无公开 API）

## 先决策：用哪个 API？

| 你的需求 | 首选 | 备选 |
|---|---|---|
| 免费、无需密钥、覆盖广 | OpenAlex | Crossref |
| 引用网络与影响力指标 | OpenAlex / Semantic Scholar | Scopus (付费) |
| 生物医学文献 | PubMed (NCBI E-utilities) | Europe PMC |
| 预印本 | arXiv API (物理/CS) | bioRxiv（无官方 API，用第三方） |
| 中文文献批量元数据 | 知网官方导出（网页） | — |
| DOI 解析与引文 | Crossref | DataCite |

## 数据库 API 总览

| 数据库 | API 名称 | 认证 | 免费额度 | 限速 | 官方文档 |
|---|---|---|---|---|---|
| OpenAlex | REST API | 无（推荐 mailto） | 完全免费 | 10 req/s，100k/天（礼貌池） | docs.openalex.org |
| Crossref | REST API | 无（推荐 mailto） | 免费 | 礼貌池 ~50 req/s | api.crossref.org |
| Semantic Scholar | Graph API | 可选密钥 | 免费 | 无密钥 100 req/5min，有密钥 1000 | api.semanticscholar.org |
| arXiv | Atom API | 无 | 免费 | 建议 <1 req/3s | export.arxiv.org/api |
| PubMed | E-utilities | NCBI 密钥（建议） | 免费 | 无密钥 3 req/s，有密钥 10 | eutils.ncbi.nlm.nih.gov |
| Scopus | Scopus Search API | Elsevier 密钥 | 付费/机构 | 依套餐 | dev.elsevier.com |
| Web of Science | WoS Expanded/Starter API | Clarivate 密钥 | 付费/机构 | 依套餐 | clarivate.com |
| CNKI/知网 | 无公开 API | — | — | — | 仅官方网页导出 |
| Google Scholar | 无官方 API | — | — | 爬取违反 ToS | 用 SerpAPI 等合规替代 |

## OpenAlex（首选，免费无密钥）

OpenAlex 收录 2.5 亿+ 文献，REST 风格，支持 `filter`、`search`、`select`、`cursor` 分页。

```bash
# 按标题关键词检索（带 mailto 进入礼貌池，提升限速）
curl "https://api.openalex.org/works?search=large+language+models+reasoning&per-page=5&mailto=you@univ.edu.cn"
```

```json
{
  "meta": { "count": 18234, "per_page": 5 },
  "results": [
    {
      "id": "https://openalex.org/W4384763251",
      "doi": "https://doi.org/10.48550/arXiv.2201.11903",
      "title": "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      "publication_year": 2022,
      "cited_by_count": 5000,
      "authorships": [ { "author": { "display_name": "Jason Wei" } } ],
      "primary_location": { "pdf_url": "https://arxiv.org/pdf/2201.11903" }
    }
  ]
}
```

常用 `filter` 参数（URL 编码；多条件用逗号=AND、竖线=OR）：

| 参数 | 示例 | 说明 |
|---|---|---|
| `filter=title.search:...` | `filter=title.search:climate` | 标题检索 |
| `filter=publication_year:...` | `filter=publication_year:2020-2024` | 年份区间 |
| `filter=open_access.is_oa:...` | `filter=open_access.is_oa:true` | 只取开放获取 |
| `select=...` | `select=id,doi,title,cited_by_count` | 字段裁剪，减小响应 |
| `cursor=*` | 翻页游标 | 用 cursor 而非 page |

Python 客户端（`pyalex` 或 requests）：

```python
import requests
r = requests.get("https://api.openalex.org/works",
                 params={"search": "topic modeling", "per-page": 25,
                         "mailto": "you@univ.edu.cn"})
works = r.json()["results"]
```

## Crossref

以 DOI 为中心，适合补全元数据、解析引文：

```bash
curl "https://api.crossref.org/works?query.bibliographic=chain-of-thought+reasoning&rows=5&mailto=you@univ.edu.cn"
curl "https://api.crossref.org/works/10.48550/arXiv.2201.11903"   # 按 DOI 取单条
```

关键参数：`query.bibliographic`（模糊书目查询）、`query.title`、`filter=from-pub-date:2023-01-01`、`rows`（最大 1000）、`cursor`（分页）。响应在 `message.items[]`，常用字段 `DOI`、`title`、`author`、`container-title`、`is-referenced-by-count`。

## Semantic Scholar（Graph API）

```bash
curl "https://api.semanticscholar.org/graph/v1/paper/search?query=retrieval+augmented+generation&fields=title,year,citationCount,openAccessPdf&limit=10"
```

- 单条：`/graph/v1/paper/DOI:10.xxxx/...` 或 `paper/arXiv:2201.11903`
- 字段白名单必填：`fields=title,year,citationCount,externalIds`
- 限速：无密钥 100 请求/5 分钟；免费密钥 1000/5 分钟（发邮件申请）
- 429 响应带 `Retry-After`，必须等待后重试

## arXiv API

arXiv 是开放 API，返回 Atom XML。检索式用 arXiv 自己的语法：

```bash
curl "http://export.arxiv.org/api/query?search_query=all:%22chain-of-thought%22+AND+cat:cs.CL&start=0&max_results=10"
```

| 字段前缀 | 含义 |
|---|---|
| `ti:` / `au:` / `abs:` | 标题 / 作者 / 摘要 |
| `cat:` | 分类（cs.CL, cs.LG, stat.ML…） |
| `all:` | 全字段 |
| 布尔 | `AND`、`OR`、`ANDNOT`、`+`（AND 简写） |

响应为 Atom feed：`<entry>` 含 `<title>`、`<summary>`、`<id>`（abs 链接）、`<author>`、`<arxiv:doi>`。解析用 `feedparser`：

```python
import feedparser
feed = feedparser.parse("http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&max_results=5")
for e in feed.entries:
    print(e.title, e.id, e.published)
```

**限速**：arXiv 要求 ≤1 请求/3 秒，批量抓取必须遵守，否则 IP 会被临时封禁。

## PubMed（NCBI E-utilities）

三步：`esearch`（拿 PMID）→ `esummary`（元数据）→ `efetch`（摘要/全文）。

```bash
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=deep+learning+prognosis&retmax=20&retmode=json&api_key=YOUR_KEY"
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=38200000&retmode=json&api_key=YOUR_KEY"
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=38200000&rettype=abstract&retmode=xml&api_key=YOUR_KEY"
```

- 限速：无 `api_key` 3 req/s；注册 NCBI 账号免费拿密钥后 10 req/s
- 检索式用 MeSH 词与字段标签：`term=("neural networks"[MeSH]) AND ("2023"[dp])`
- 大数据集用 `esearch` 的 `usehistory=y` + `WebEnv`/`query_key` 分页，避免超时

## Scopus 与 Web of Science（机构订阅）

- **Scopus**：`https://api.elsevier.com/content/search/scopus?query=TITLE("topic modeling")&apiKey=KEY`，另需 `insttoken` 访问机构订阅内容；单次最多 25 条，游标翻页
- **Web of Science**：`https://api.clarivate.com/apis/wos-starter/v1/documents?q=TS=(topic modeling)&db=WOS&apiKey=KEY`
- 两者都需要机构订阅或付费密钥；**优先用 OpenAlex 验证思路**，付费 API 只在必须用官方影响力指标（如 Scopus 的 SJR/SNIP、WoS 的 IF）时再申请

## CNKI/知网与 Google Scholar 的特殊说明

- **知网**：没有公开的官方 REST API；批量导出走网页端"导出与分析 → 自定义/参考文献"生成文献格式。抓取知网页面违反其服务条款，且有反爬。合规路径：机构图书馆数据库访问 + 官方导出；如需程序化处理，用导出的 RIS/TXT 文件做下游解析
- **Google Scholar**：同样无官方 API，直接爬取违反 ToS 并会被封 IP；需要程序化访问时，用合规的第三方服务（SerpAPI 等，需付费）或改用 OpenAlex/Semantic Scholar（覆盖大部分引用数据）

## 查询参数对比速查

| 需求 | OpenAlex | Crossref | Semantic Scholar | arXiv | PubMed |
|---|---|---|---|---|---|
| 关键词 | `search` | `query.bibliographic` | `query` | `search_query=all:` | `term=` |
| 年份 | `filter=publication_year:` | `filter=from-pub-date:` | `year=` | — | `[dp]` |
| 分页 | `cursor` | `cursor` | `offset`(≤1000) | `start` | `retstart` |
| 排序 | `sort=` | `sort=` | — | `sortBy=` | `sort=` |
| 字段裁剪 | `select=` | — | `fields=`（必填） | — | `retmax` |

## 限速与密钥管理

- **统一策略**：所有请求带 `mailto=`（OpenAlex/Crossref）或 `api_key=`（NCBI/Elsevier）提升额度并让数据提供方可以联系你
- 遇到 `429`/`403`：读响应头的 `Retry-After`，指数退避重试（`time.sleep(2**attempt)`），不要狂刷
- 密钥存放在环境变量（`os.environ["ELSEVIER_API_KEY"]`），绝不硬编码进代码或提交到 git
- 批量任务加本地缓存（按 DOI/ID 存 JSON），避免重复请求同一资源
- 遵守各库限速是"礼貌"更是合规要求，滥用会被封 IP 或吊销密钥

## RIS 与 BibTeX：导出与解析

RIS（文献管理软件通用格式）：

```ris
TY  - JOUR
AU  - Wei, Jason
TI  - Chain-of-Thought Prompting Elicits Reasoning in Large Language Models
JO  - arXiv
PY  - 2022
DO  - 10.48550/arXiv.2201.11903
ER  - 
```

BibTeX：

```bibtex
@article{wei2022chain,
  title={Chain-of-Thought Prompting Elicits Reasoning in Large Language Models},
  author={Wei, Jason and Wang, Xuezhi and Schuurmans, Dale and others},
  journal={arXiv preprint arXiv:2201.11903},
  year={2022},
  doi={10.48550/arXiv.2201.11903}
}
```

| 标签 | RIS 字段 | 说明 |
|---|---|---|
| 文献类型 | `TY` | JOUR/BOOK/CONF/THES 等 |
| 作者 | `AU` | 每作者一行 |
| 标题 | `TI` | — |
| 期刊/会议 | `JO` / `T2` | — |
| 年份 | `PY` | — |
| DOI | `DO` | 去重与链接的关键 |
| 结束标记 | `ER` | 每条记录以 ER 结束 |

Python 解析：`rispy`（RIS）、`bibtexparser`（BibTeX）；去重以 DOI 为主键（无 DOI 用 标题+年份+第一作者）。

## 合法与伦理使用

- **条款（ToS）**：任何程序化访问先读该库的 API 政策与使用条款；无 API 的库（知网、Google Scholar）默认禁止爬取
- **版权**：可批量获取元数据与摘要；全文下载与再分发受版权限制，商业用途与文本挖掘需单独授权（如 Scopus 的 TDM 许可）
- **数据再利用**：大规模下载的元数据若重新发布，遵守各库署名与许可要求（OpenAlex 用 CC0，可放心）
- **研究伦理**：检索策略要透明可复现——记录检索式、日期、数据库、去重规则，写进论文方法部分
- **出口与合规**：涉及敏感数据时，遵守所在机构与国家的数据合规要求

## 常见陷阱

1. 用 OpenAlex 的 `page` 翻页（超过 10 万结果会失效）——必须用 `cursor`
2. 不传 `mailto`/`api_key`，高频访问被封
3. 爬 Google Scholar/知网页面 → ToS 违规 + IP 被封
4. Semantic Scholar 忘记 `fields` 白名单 → 400 错误
5. arXiv 请求频率过高被临时封禁
6. 用 DOI 去重时忽略 DOI 大小写与 `https://doi.org/` 前缀规范化
7. RIS 解析时丢失 `AU` 多行或 `ER` 结尾导致记录截断
8. 论文方法部分不记录检索日期与策略 → 无法复现检索

## 完成清单

- [ ] 按需求选定 API（默认 OpenAlex + Crossref 组合）
- [ ] 阅读目标库的官方文档与 ToS
- [ ] 密钥存入环境变量，请求带 mailto/api_key
- [ ] 分页用游标，限速用退避重试
- [ ] 本地缓存元数据，按 DOI 去重
- [ ] 导出 RIS/BibTeX 并校验解析结果
- [ ] 记录检索式、日期与去重规则供论文方法部分
