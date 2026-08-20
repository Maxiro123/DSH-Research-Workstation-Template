---
name: sem
description: 当研究者需要构建或检验结构方程模型（SEM）、进行验证性因子分析（CFA）、路径分析、潜变量建模、中介或调节效应分析时使用本技能，涵盖模型设定、拟合评价、模型修正及 R lavaan / AMOS / SPSS 工作流程。
---

# 结构方程模型（SEM）

## 何时使用本技能

结构方程模型（Structural Equation Modeling, SEM）用于同时检验测量模型（潜变量与其观测指标的关系）与结构模型（潜变量之间的因果关系）。当研究满足以下任一情形时，应引导研究者使用 SEM：

- 研究涉及**无法直接观测的潜变量**（如焦虑、工作满意度、自我效能），需要先验证测量工具（CFA）；
- 需要同时估计**多条路径**（一个模型内包含多个回归关系）；
- 需要检验**中介效应**（X → M → Y）或**调节效应**（X×W → Y）；
- 需要比较多组之间**测量不变性**（跨性别、跨文化比较的前提）；
- 传统回归（OLS）无法处理测量误差、共线性或复杂路径。

**不适用**：纯粹的预测（用回归即可）、探索性因子结构（用 EFA）、变量全部可直接观测且路径简单的场景。

## 核心概念速查

| 术语 | 含义 | 说明 |
| --- | --- | --- |
| 潜变量 (latent variable) | 无法直接测量的构念 | 图形中用椭圆表示 |
| 观测变量 (indicator) | 潜变量的测量题项 | 图形中用方框表示 |
| 测量模型 | 潜变量 ↔ 指标的关系 | lavaan 中用 `=~` 表示 |
| 结构模型 | 潜变量之间的回归关系 | lavaan 中用 `~` 表示 |
| 因子载荷 (loading) | 指标对潜变量的标准化回归系数 | 建议 ≥ 0.5，理想 ≥ 0.7 |
| 组合信度 CR | 潜变量的内部一致性 | ≥ 0.7 |
| 平均方差抽取量 AVE | 潜变量解释的方差比例 | ≥ 0.5 |
| 区分效度 | 各潜变量彼此不同 | AVE 平方根 > 构念间相关；HTMT < 0.85（严格）/ 0.90（宽松） |

## 标准工作流程（分步）

### 第 1 步：明确理论模型

先画路径图，明确每个潜变量的指标、变量之间的方向性假设（基于理论，而非数据驱动）。SEM 是"验证性"技术，模型应预先设定，事后修正必须有理论依据。

### 第 2 步：评估样本量

- 经验法则：**N ≥ 200**；复杂模型建议 **N ≥ 400**；
- 按参数个数：每个待估参数至少 **5–10 个样本**（含载荷、路径、方差、协方差、截距）；
- 按指标数：每个潜变量至少 **3 个指标**（2 个亦可识别但较弱），每个指标 10–20 个样本；
- 若计划分组比较或使用稳健估计（MLR），样本量需进一步增大。

### 第 3 步：数据准备与正态性检查

```r
summary(dat)
library(psych)
describe(dat)
# 多元正态性（Mardia 检验）
library(MVN)
mvn(dat, mvnTest = "mardia")
```

- 非正态：用 `estimator = "MLR"`（稳健 ML）或 bootstrap；
- 有序分类数据（李克特 4–5 点）：用 `estimator = "DWLS"`（对角加权最小二乘，即 WLSMV 类）；
- 缺失数据：FIML（`missing = "fiml"`）优于列表删除。

### 第 4 步：先检验测量模型（CFA）

测量模型检验不通过时，不应直接进入结构模型：

```r
library(lavaan)
cfa_model <- '
  anxiety    =~ a1 + a2 + a3 + a4
  stress     =~ s1 + s2 + s3 + s4
  wellbeing  =~ w1 + w2 + w3
'
fit_cfa <- cfa(cfa_model, data = dat, estimator = "MLR")
summary(fit_cfa, fit.measures = TRUE, standardized = TRUE)
fitMeasures(fit_cfa, c("chisq", "df", "cfi", "tli", "rmsea", "srmr"))
```

判断标准：
- 每个指标载荷显著且 ≥ 0.5；
- 整体拟合达到可接受水平（见下表）；
- CR ≥ 0.7、AVE ≥ 0.5（收敛效度）；
- AVE 平方根 > 各潜变量间相关系数，或 HTMT < 0.85（区分效度）。

### 第 5 步：检验结构模型

```r
struct_model <- '
  anxiety    =~ a1 + a2 + a3 + a4
  stress     =~ s1 + s2 + s3 + s4
  wellbeing  =~ w1 + w2 + w3
  # 结构路径
  stress     ~ anxiety
  wellbeing  ~ stress + anxiety
'
fit_struct <- sem(struct_model, data = dat, estimator = "MLR")
summary(fit_struct, fit.measures = TRUE, standardized = TRUE)
```

报告：各路径的标准化系数 β、SE、p 值；潜变量的 R²；整体拟合指标。

### 第 6 步：模型修正（仅在必要时）

查看修正指数（Modification Indices, MI）：

```r
modindices(fit_struct, sort. = TRUE, minimum.value = 4)
```

- MI > 4 表示释放该参数可显著改善 χ²（每释放 1 df 约降 4）；
- **只允许有理论依据的修正**：如同一潜变量内指标误差相关、按题项措辞（如反向题）相关；
- 禁止单纯为凑拟合指数而随意加跨载荷或误差相关；修正后必须报告原模型与修正模型。

### 第 7 步：中介与调节分析

**中介（mediation）**：报告间接效应并做 bootstrap：

```r
library(semTools)
set.seed(2024)
fit_boot <- sem(struct_model, data = dat, se = "bootstrap", bootstrap = 5000)
ind <- indirect_effect(fit_boot, x = "anxiety", m = "stress", y = "wellbeing")
summary(ind)   # 标准化间接效应及其 bootstrap CI
```

- 判断：间接效应 bootstrap 95% CI **不含 0** → 中介成立；
- 现代做法直接报告总效应、直接效应、间接效应与各自 CI，不必拘泥 Baron & Kenny 四步法；Sobel 检验依赖正态假设，推荐 bootstrap 代替。

**调节（moderation）**：潜变量交互可用乘积指标法（semTools `indProd`）或两步法；简单做法是先由 CFA 得到因子得分再做回归交互，并报告简单斜率：

```r
fs <- lavPredict(fit_cfa)
dat2 <- cbind(dat, fs)
m_mod <- lm(wellbeing ~ stress * anxiety, data = dat2)
summary(m_mod)
# 简单斜率：在焦虑低(-1SD)/中(0)/高(+1SD)处的 stress 效应
library(emmeans)
emtrends(m_mod, ~ anxiety, var = "stress",
         at = list(anxiety = c(-1, 0, 1)))
```

## 模型拟合指标与解释阈值

| 指标 | 可接受 | 良好 | 说明 |
| --- | --- | --- | --- |
| χ² / df | < 5 | < 3 | χ² 对样本量敏感，大样本几乎必显著，勿单独依赖 |
| CFI | ≥ 0.90 | ≥ 0.95 | 比较拟合指数，较稳健 |
| TLI (NNFI) | ≥ 0.90 | ≥ 0.95 | 惩罚模型复杂度 |
| RMSEA | ≤ 0.08 | ≤ 0.05 | 报告 90% CI，上界 < 0.10 |
| SRMR | ≤ 0.08 | < 0.05 | 标准化残差均方根 |

报告惯例：同时报告 χ²/df、CFI、TLI、RMSEA（含 90% CI）、SRMR 五项。

## 决策标准速查

| 情形 | 选择 |
| --- | --- |
| 数据多元正态 | ML |
| 非正态 / 小样本 | MLR（稳健）或 bootstrap SE |
| 有序分类指标（如 5 点李克特） | DWLS/WLSMV |
| 缺失数据 | FIML（`missing = "fiml"`） |
| 比较两组及以上 | 先检验测量不变性（configural → metric → scalar），再比结构路径 |
| 中介检验 | bootstrap 5000 次 + BCa CI |
| 调节检验 | 潜交互（indProd/twoStage）或因子得分 + 简单斜率 |

## R lavaan 工作流要点

```r
cfa(model, data)          # 仅测量模型
sem(model, data)          # 含结构路径的完整模型
lavaan(model, data)       # 更底层的通用接口

summary(fit, fit.measures = TRUE, standardized = TRUE)
fitMeasures(fit, c("chisq", "df", "cfi", "tli", "rmsea", "srmr"))
parameterEstimates(fit, standardized = TRUE, ci = TRUE)
modindices(fit, sort. = TRUE)
anova(fit1, fit2)         # 嵌套模型 χ² 差异检验

# 测量不变性（分组比较前提）
fit_config <- cfa(cfa_model, data = dat, group = "gender")
fit_metric <- cfa(cfa_model, data = dat, group = "gender",
                  group.equal = "loadings")
fit_scalar <- cfa(cfa_model, data = dat, group = "gender",
                  group.equal = c("loadings", "intercepts"))
anova(fit_config, fit_metric, fit_scalar)  # ΔCFI ≤ 0.01 视为可接受
```

## AMOS / SPSS 要点

- **AMOS**（SPSS 的 SEM 模块，需单独安装）：图形化建模——方框放观测变量、椭圆放潜变量、单向箭头画路径、双向箭头画相关；数据用 SPSS 文件；默认 ML 估计；输出勾选 "Standardized estimates" 与 "Modification indices"；中介效应用 bootstrap（Analysis Properties → Bootstrap，勾选 BCa）；缺失数据勾选 "Estimate means and intercepts" 启用 FIML。
- **SPSS** 主界面本身没有 SEM 功能（AMOS 是独立于 SPSS 主界面的模块）；若只有 SPSS，可计算因子得分后做回归近似，但这不是严格意义的 SEM。
- 分组比较在 AMOS：Manage Groups 建组，并设置 measurement weights / structural weights 等约束做嵌套比较。

## 交付报告清单

- [ ] 报告样本量及其合理性（N ≥ 200 或 5–10/参数）
- [ ] 报告数据正态性处理方式（ML/MLR/DWLS）与缺失处理
- [ ] 报告测量模型：载荷、CR、AVE、区分效度
- [ ] 报告五项拟合指标（χ²/df、CFI、TLI、RMSEA+CI、SRMR）
- [ ] 报告标准化路径系数、SE、p、R²
- [ ] 报告中介/调节效应及其 bootstrap CI
- [ ] 报告修正过程（MI 与理论依据）
- [ ] 结论与局限（横断数据不可做因果推断）

## 常见误区

| 误区 | 后果 | 正确做法 |
| --- | --- | --- |
| 样本量不足还跑复杂模型 | 估计不稳定、不收敛 | 先算样本量，简化模型或增样本 |
| 只看 χ² 是否显著 | 大样本误判模型差 | 综合 CFI/TLI/RMSEA/SRMR |
| 不看正态性直接用 ML | 标准误偏小、χ² 膨胀 | 用 MLR 或 bootstrap |
| 按 MI 随意修改模型 | 拟合好但无理论、不可复制 | 仅做有理论依据的修正 |
| 组间比较前不检验测量不变性 | 比较结果无意义 | 先做 configural/metric/scalar |
| 横断数据下结论说"因果" | 过度解释 | 用纵向/实验设计，措辞谨慎 |
| 把 5 点李克特当连续变量 | 参数偏差 | 用 DWLS/WLSMV |
