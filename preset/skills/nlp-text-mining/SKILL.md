---
name: nlp-text-mining
description: 当研究任务涉及中文或英文文本的清洗、分词、向量化、LDA 主题建模、情感分析或文本分类时，使用本技能获得可复现的文本挖掘工作流。
---

# nlp-text-mining

## 何时使用本技能

当研究数据是以下形式之一，且需要从中提取可量化的信息时使用：

- 论文全文、新闻、政策文件、访谈转录稿、问卷开放题等非结构化文本
- 需要关键词提取、主题发现、情感判定、文本归类中的任意一种
- 需要把文本转换成机器学习可用的数值特征（TF-IDF、词向量）
- 需要与同行交流分词、特征化、建模与评估的完整可复现流程

**不适合使用**：仅需统计词频的简单描述（可直接用 Excel/词云）；需要大模型语义理解的多轮问答（请使用 LLM 而非传统文本挖掘）。

## 核心流水线

```
采集 → 清洗 → 分词/词形还原 → 特征化 → 建模 → 评估 → 报告
```

一条铁律：**任何基于全部数据的统计量（词表、TF-IDF 拟合、停用词、向量空间）都必须在划分训练/测试集之后、只用训练集拟合**，否则会造成数据泄漏、指标虚高。

## 标准工作流程（8 步）

1. 明确分析单元（document = 一篇论文？一个段落？一条评论？）与样本量
2. 采集与抽样：记录来源、时间、去重策略
3. 清洗：去 HTML、URL、噪声字符、规范化
4. 分词 / 词形还原（中文 jieba；英文 NLTK/spaCy）
5. 特征化：TF-IDF 或词向量
6. 建模：LDA / 情感分析 / 文本分类
7. 评估：用测试集指标 + 人工抽查样例
8. 报告：写清预处理与参数，保证可复现

## 1. 文本预处理

| 操作 | 处理对象 | 说明 |
|---|---|---|
| 去 HTML/URL | 网页抓取文本 | `BeautifulSoup` 或正则 |
| 全半角统一 | 中英混排 | 中文标点转全角、英文转半角 |
| 繁简转换 | 中文 | `opencc`（t2s） |
| 去重字符 | 社交文本 | 连续重复字符压缩 |
| 词形还原 | 英文 | lemmatization 优于 stemming（保留语义、词性一致） |

Python 示例：

```python
import re
import opencc

cc = opencc.OpenCC("t2s")  # 繁→简

def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)                  # 去 HTML
    text = re.sub(r"https?://\S+|www\.\S+", "", text)    # 去 URL
    text = re.sub(r"\s+", " ", text)                     # 压缩空白
    return cc.convert(text.strip())
```

## 2. 中文分词：jieba

三种模式：

- `jieba.cut(s)` 精确模式（默认，研究首选）
- `jieba.cut(s, cut_all=True)` 全模式（召回多，噪声大）
- `jieba.cut_for_search(s)` 搜索引擎模式（用于建立索引）

```python
import jieba
import jieba.analyse
import jieba.posseg as pseg

# 1) 自定义词典（领域术语，如"计量经济学"不可被拆开）
jieba.add_word("计量经济学")
jieba.load_userdict("domain_words.txt")  # 每行: 词 词频 词性

# 2) 分词并过滤停用词与单字
STOP = set(open("stopwords_cn.txt", encoding="utf-8").read().split())
def tokenize(text: str):
    return [w for w in jieba.cut(text) if w.strip() and w not in STOP and len(w) > 1]

# 3) 关键词提取（TF-IDF 或 TextRank）
kw = jieba.analyse.extract_tags(text, topK=10, withWeight=True)

# 4) 词性标注（筛名词/动词）
words = [(w, f) for w, f in pseg.cut(text) if f.startswith(("n", "v"))]
```

**陷阱**：jieba 版本升级或词典变更会导致分词结果不一致——研究项目里应固定 jieba 版本并把自定义词典入库保存。

## 3. 英文分词：NLTK 与 spaCy

| 工具 | 优势 | 适用 |
|---|---|---|
| NLTK | 轻量、教学友好 | 简单词形还原、停用词 |
| spaCy | 快、管线完整（句法、NER） | 大规模英文语料、NER 特征 |

```python
import spacy
nlp = spacy.load("en_core_web_sm")
doc = nlp("The researchers studied climate policy.")
tokens = [t.lemma_.lower() for t in doc if not t.is_stop and not t.is_punct]
```

## 4. 特征化：TF-IDF

TF-IDF = 词频 × 逆文档频率，降低常见词权重、突出区分性词。

```python
from sklearn.feature_extraction.text import TfidfVectorizer

# 只对训练集 fit，测试集 transform（防止泄漏）
vec = TfidfVectorizer(
    tokenizer=tokenize,           # 中文：传入 jieba 分词函数
    ngram_range=(1, 2),           # 加入二元组提升表达力
    min_df=2, max_df=0.9,         # 去掉只在1篇出现/90%以上文档都出现的词
    sublinear_tf=True,            # 1+log(tf)，抑制高频词
)
X_train = vec.fit_transform(train_docs)
X_test = vec.transform(test_docs)  # 禁止再次 fit
```

何时用 `CountVectorizer`（纯词频）？朴素贝叶斯等对频数敏感、或需要保留可解释的原始频数时。

## 5. 主题建模：LDA

```python
from gensim import corpora, models
from gensim.models.coherencemodel import CoherenceModel

# 语料：每篇文档是分词列表
dictionary = corpora.Dictionary(tokenized_docs)
dictionary.filter_extremes(no_below=5, no_above=0.5)   # 过滤低频与过常见词
corpus = [dictionary.doc2bow(d) for d in tokenized_docs]

# 训练（固定 seed 保证可复现）
lda = models.LdaModel(corpus, num_topics=8, id2word=dictionary,
                      random_state=42, passes=20)

# 选择主题数 k：比较不同 k 的困惑度与一致性
for k in [5, 8, 12, 16]:
    m = models.LdaModel(corpus, num_topics=k, id2word=dictionary, random_state=42)
    cm = CoherenceModel(model=m, texts=tokenized_docs, dictionary=dictionary, coherence="c_v")
    print(k, round(m.log_perplexity(corpus), 2), round(cm.get_coherence(), 3))
```

**选择 k 的实务**：一致性（c_v）比困惑度更贴近人类判断；在"一致性拐点"附近取 k，并人工阅读各主题 top 词与代表文档来命名主题。主题是研究构念，必须人工验证，不能只依赖指标。

## 6. 情感分析

| 方法 | 中文 | 英文 | 说明 |
|---|---|---|---|
| 词典法 | SnowNLP、知网情感词典 | VADER | 快、无需标注，但领域迁移差 |
| 机器学习 | 自训练分类器 | 同上 | 需人工标注样本 |

```python
from snownlp import SnowNLP
s = SnowNLP("这部电影的剧情紧凑，但结尾略显仓促。")
s.sentiments          # 0~1 积极倾向

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
v = SentimentIntensityAnalyzer()
v.polarity_scores("This paper is a major breakthrough.")["compound"]
```

**陷阱**：词典是领域相关的——"高冷""坑"在商品评论和学术评述中极性相反。正式研究应标注少量样本做一致性检验（Cohen's kappa ≥ 0.7 后再用于全量数据）。

## 7. 词向量（Word Embeddings）

```python
from gensim.models import Word2Vec
model = Word2Vec(sentences=tokenized_docs, vector_size=100,
                 window=5, min_count=2, workers=4, seed=42)
model.wv.most_similar("开放获取", topn=10)
model.wv.similarity("数据", "信息")
```

预训练资源：中文可用腾讯 AI Lab 词向量（约 800 万词）、`fastText` 官方向量；英文可用 `glove-wiki-gigaword`（gensim 一键下载）。词向量适合做相似度、聚类输入，或作为分类模型的特征，但**不能直接解释为"语义真值"**，需结合下游任务评估。

## 8. 文本分类

```python
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

pipe = Pipeline([
    ("vec", TfidfVectorizer(tokenizer=tokenize, ngram_range=(1, 2))),
    ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
])
scores = cross_val_score(pipe, texts, labels, cv=5, scoring="f1_macro")
print(scores.mean(), scores.std())
```

类别不平衡、超参数调优、SHAP 解释的具体做法见 `machine-learning-research` 技能。

## 9. R 工具（tm / quanteda）

| 工具 | 定位 | 常用函数 |
|---|---|---|
| `tm` | 经典语料库与 DTM | `VCorpus`, `DocumentTermMatrix` |
| `quanteda` | 现代文本分析 | `corpus`, `tokens`, `dfm`, `textstat_keyness` |
| `jiebaR` | 中文分词 | `worker()`, `segment()` |
| `topicmodels` | LDA/CTM | `LDA()`, `perplexity()` |

## 10. 评估指标速查

| 任务 | 指标 | 说明 |
|---|---|---|
| 分类 | accuracy / precision / recall / F1 | 不平衡数据看 macro-F1 或加权 F1 |
| 情感一致性 | Cohen's kappa | 与人工标注的一致性 |
| 主题质量 | c_v coherence | 越高越好（同语料内比较） |
| 聚类 | silhouette | 轮廓系数 |
| 关键词 | 与标准答案重叠率 | 人工标注 top-k 命中 |

## 常见陷阱（务必逐条检查）

1. 在划分训练/测试之前拟合 TF-IDF 或构建词典 → 数据泄漏，指标虚高
2. 未固定随机种子（jieba 词典、LDA、Word2Vec）→ 不可复现
3. 只报告困惑度不报告主题一致性 → 主题质量无保证
4. 忽略领域停用词（如"本文""研究"在论文语料中无区分度）
5. 情感词典跨领域直接使用且未做一致性检验
6. 用词向量相似度做因果推断
7. 忘记在论文方法部分报告预处理细节（词典版本、停用词来源、参数）

## 完成清单

- [ ] 明确分析单元与样本量
- [ ] 清洗规则与繁简转换已记录
- [ ] 分词工具与版本固定，自定义词典入库
- [ ] 训练/测试划分在特征化之前完成
- [ ] LDA 报告了 k 的选择依据与 c_v 一致性
- [ ] 情感分析做了人工一致性检验
- [ ] 全部随机种子固定，流程可复现
