---
name: statistical-analysis
description: 当研究者需要选择正确的统计检验（t 检验、方差分析、回归、卡方、非参数检验）、检查正态性与方差齐性、计算效应量与置信区间，或需要 SPSS 菜单路径及对应的 R/Python 代码时使用。
---

# statistical-analysis

> 统计分析（Statistical Analysis）——以 SPSS 菜单路径为主线、R 与 Python 为对照，帮助 AI 代理为研究者完成从数据检查、检验选择到结果报告的全流程。

## 何时使用本技能

- 研究者问"我的数据该用什么检验？"
- 需要写 SPSS 操作步骤或生成 R/Python 分析代码。
- 需要检查正态性、方差齐性并决定参数/非参数路径。
- 需要计算并报告效应量与置信区间。
- 需要按期刊要求规范报告统计结果（APA 风格）。

## 核心原则

1. **先看变量类型与设计，再选检验**——检验选择由"变量测量尺度 + 分组结构"决定。
2. **先检查假设，再跑检验**——正态性、方差齐性决定参数 vs 非参数。
3. **报告完整信息**——检验统计量、自由度、p 值、效应量、置信区间缺一不可。
4. **统计显著 ≠ 实际重要**——始终报告效应量。

## 变量类型（选择检验的第一步）

| 尺度 | 特点 | 例子 | 允许的运算 |
|------|------|------|-----------|
| 定类 nominal | 分类无顺序 | 性别、血型 | 频数、众数 |
| 定序 ordinal | 分类有顺序 | 满意度等级、排名 | 中位数 |
| 定距 interval | 等距无绝对零点 | 温度、量表总分 | 均值、方差 |
| 定比 ratio | 有绝对零点 | 身高、时间、金额 | 全部 |

- 统计检验按变量"定类/定序"（非参数友好）vs"定距/定比"（参数检验）划分。
- 选择检验前先问：**因变量是什么尺度？自变量是分组（几个水平）还是连续变量？观测是否配对/重复？**

## 标准分析工作流

1. 数据清洗：缺失值、异常值、编码错误（SPSS: 数据→选择个案/清理；先做频率表）。
2. 描述统计：数值变量（均值、SD、中位数、IQR、偏度、峰度）；分类变量（频数、百分比）。
3. 假设检查：正态性（Shapiro-Wilk + QQ 图）、方差齐性（Levene）。
4. 主分析：按下方决策表选择检验并运行。
5. 效应量与置信区间。
6. 按报告模板写出结果段落。

## 描述统计

**SPSS**：分析→描述统计→描述（均值、SD、最小值、最大值）；→频率（分类变量、中位数、百分位数）；→探索（完整汇总 + 正态性检验 + 箱线图）。

```r
# R
summary(dat); describe(dat)          # psych 包
sd(dat$score, na.rm = TRUE)
```

```python
# Python
import pandas as pd
df.describe()
df['score'].agg(['mean','median','std','skew','kurt'])
```

## 正态性检验

| 方法 | 说明 | 适用 |
|------|------|------|
| Shapiro-Wilk | 功效最强 | n < 5000 首选 |
| Kolmogorov-Smirnov | 较弱，常误判 | 大样本备用 |
| 偏度/峰度 | ｜偏度｜<2 且｜峰度｜<7 大致可接受 | 快速筛查 |
| QQ 图/直方图 | 目视 | 所有情况 |

- SPSS：分析→描述统计→探索→"图"选项卡勾选"带检验的正态图"→看 Shapiro-Wilk 行。
- R：`shapiro.test(x)`；`car::qqPlot(x)`。
- Python：`scipy.stats.shapiro(x)`；`statsmodels.api.qqplot(x, line='s')`。

```r
shapiro.test(dat$score)
# p > 0.05 → 不能拒绝正态，可用参数检验
```

**重要误区**：中心极限定理不豁免正态性——大样本下均值检验尚可（n>30 的粗略经验），但 t 检验/ANOVA 对严重偏态 + 小样本仍脆弱。正态性检验本身受样本量影响：小样本检出率低、大样本对微小偏离敏感。**正确做法：结合检验 + QQ 图 + 样本量综合判断**。

## 方差齐性（Levene 检验）

- SPSS：分析→比较均值→独立样本T检验→"选项"勾选 Levene；或 分析→一般线性模型→单变量→"选项"→方差齐性检验。
- R：`car::leveneTest(score ~ group, data = dat)`。
- Python：`scipy.stats.levene(*[df[df.g==g].score for g in df.g.unique()])`。
- Levene p > 0.05 → 齐性成立；不成立时用 Welch 校正（SPSS 输出自动给出"不假定等方差"行；R `t.test(var.equal=FALSE)` 默认；ANOVA 用 Welch 版本）。

## 检验选择决策表（核心）

以**因变量**尺度与**研究设计**定位：

| 因变量尺度 | 设计 | 参数检验 | 非参数替代 |
|-----------|------|----------|-----------|
| 定距/定比 | 单样本 vs 常数 | 单样本 t 检验 | Wilcoxon 符号秩检验 |
| 定距/定比 | 两独立组 | 独立样本 t 检验 | Mann-Whitney U |
| 定距/定比 | 两配对组 | 配对 t 检验 | Wilcoxon 符号秩检验 |
| 定距/定比 | ≥3 独立组 | 单因素 ANOVA | Kruskal-Wallis H |
| 定距/定比 | ≥3 配对/重复 | 重复测量 ANOVA | Friedman 检验 |
| 定距/定比 | 两因素设计 | 双因素 ANOVA（析因） | 排列/秩转换法 |
| 定距/定比 | 1 连续自变量 | 简单线性回归/相关 | Spearman 相关 |
| 定距/定比 | 多个自变量 | 多元线性回归 | 稳健回归 |
| 定类 | 两定类变量的关联 | 卡方检验 | Fisher 精确检验（小样本） |
| 定类（二分类） | 预测 | 二元 Logistic 回归 | — |
| 定序 | 相关 | Spearman 相关 | — |
| 生存时间 | 时间-事件 | Kaplan-Meier、Cox 回归 | — |

辅助决策：
- **显著偏离正态 + 小样本** → 非参数。
- **分类变量** → 卡方/Logistic，不查正态性。
- **重复测量** → 优先混合模型/重复测量 ANOVA，勿把多次观测当独立样本。

## 各检验详解

### 1. 独立样本 t 检验
- 用途：比较两个独立组均值。
- 假设：正态（或大样本）、方差齐性（可 Welch 校正）、观测独立。
- 公式：t = (x̄₁ − x̄₂) / SE；SE = √(s_p²(1/n₁ + 1/n₂))；df = n₁ + n₂ − 2。
- SPSS：分析→比较均值→独立样本T检验→组变量定义组（如 1/2），检验变量放入因变量。
- R：`t.test(score ~ group, data = dat)`。
- Python：`scipy.stats.ttest_ind(a, b)`（`equal_var=False` 为 Welch）。
- 效应量：Cohen's d = (x̄₁ − x̄₂) / s_pooled。
- 报告：`t(58) = 2.34, p = .023, d = 0.61, 95% CI [0.52, 6.48]`。

### 2. 配对 t 检验
- 用途：同一被试前后测或配对对象比较。
- SPSS：分析→比较均值→配对样本T检验。
- R：`t.test(pre, post, paired = TRUE)`。
- Python：`scipy.stats.ttest_rel(pre, post)`。
- 效应量：d = (x̄_diff) / s_diff。
- 报告：`t(29) = 3.11, p = .004, d = 0.57`。

### 3. 单因素 ANOVA
- 用途：≥3 个独立组均值差异。
- 公式：F = MS组间 / MS组内。
- SPSS：分析→比较均值→单因素ANOVA→"事后比较"选 Tukey（齐性）/ Games-Howell（不齐）→"选项"勾选描述性与方差齐性检验。
- R：`aov(score ~ group, data = dat)` → `summary()`；`car::Anova(aov(...), type = 3)`。
- Python：`statsmodels.formula.api.ols('score ~ C(group)', data=df).fit()` → `sm.stats.anova_lm()`。
- 效应量：η² = SS组间 / SS总；partial η² = SS组间/(SS组间+SS误差)。
- **ANOVA 显著 ≠ 知道哪两组不同** → 必须事后检验（Tukey HSD、Bonferroni、Games-Howell）。

```r
# R：ANOVA + Tukey 事后
m <- aov(score ~ group, data = dat)
summary(m); TukeyHSD(m)
```

```python
# Python：ANOVA + Tukey
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.multicomp import pairwise_tukeyhsd
m = ols('score ~ C(group)', data=df).fit()
print(sm.stats.anova_lm(m, typ=2))
print(pairwise_tukeyhsd(df.score, df.group))
```

### 4. 重复测量 ANOVA
- 用途：同一被试多次测量（≥3 次）。
- SPSS：分析→一般线性模型→重复测量→定义被试内因子（次数）→把各次测量变量放入。
- 注意球形性假设（Mauchly 检验），违反时看 Greenhouse-Geisser 校正行。
- R：`afex::aov_ez(id="id", dv="score", within="time", data=dat)`。
- Python：`statsmodels.stats.anova.AnovaRM(df, 'score', 'id', within=['time']).fit()`。

### 5. 卡方检验
- 用途：两个（或多个）分类变量的关联。
- 公式：χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ，Eᵢ = 行合计×列合计/总数。
- 适用条件：所有期望频数 ≥ 5（2×2 表）；否则用 Fisher 精确检验或合并类别。
- SPSS：分析→描述统计→交叉表→行/列变量→"统计"勾选卡方→"单元格"勾选期望计数与百分比。
- R：`chisq.test(table(dat$gender, dat$pass))`；`fisher.test()`。
- Python：`scipy.stats.chi2_contingency(pd.crosstab(...))`。
- 效应量：Cramér's V = √(χ²/(n × min(r−1, c−1)))。
- 报告：`χ²(1, N = 120) = 7.02, p = .008, V = 0.24`。

### 6. 非参数检验
| 检验 | 对应参数检验 | SPSS 路径 | R | Python |
|------|------------|-----------|-----|--------|
| Mann-Whitney U | 独立 t | 分析→非参数检验→独立样本 | `wilcox.test(a, b)` | `scipy.stats.mannwhitneyu` |
| Wilcoxon 符号秩 | 配对 t | 分析→非参数检验→相关样本 | `wilcox.test(pre, post, paired=TRUE)` | `scipy.stats.wilcoxon` |
| Kruskal-Wallis H | 单因素 ANOVA | 分析→非参数检验→独立样本（K 个样本） | `kruskal.test(score ~ group)` | `scipy.stats.kruskal` |
| Friedman | 重复测量 ANOVA | 分析→非参数检验→相关样本 | `friedman.test()` | `scipy.stats.friedmanchisquare` |
| Spearman 相关 | Pearson | 分析→相关→双变量（勾选 Spearman） | `cor(x, y, method="spearman")` | `scipy.stats.spearmanr` |

非参数检验比较的是**分布/秩**而非均值，报告时应给出中位数与 IQR，而非均值 ± SD。

### 7. 线性回归
- 模型：Y = β₀ + β₁X₁ + … + βₖXₖ + ε。
- 关键输出：回归系数 β 及其 95% CI、p 值；模型拟合 R²（解释方差比例）、调整 R²；整体 F 检验。
- 假设：线性、误差独立、同方差、正态（残差）、无多重共线性（VIF < 10）。
- SPSS：分析→回归→线性→因变量/自变量→"统计"勾选估计、置信区间、共线性诊断。
- R：`lm(y ~ x1 + x2, data = dat)` → `summary()`；`car::vif()`。
- Python：`statsmodels.formula.api.ols('y ~ x1 + x2', data=df).fit()` → `summary()`。
- 报告：`β = 0.42, SE = 0.15, t(97) = 2.80, p = .006, 95% CI [0.12, 0.72]`；模型 `F(2, 97) = 8.15, p < .001, R² = .14`。
- 分类预测变量需虚拟编码；**相关性不证明因果**，回归同样。

### 8. Logistic 回归
- 用途：二分类因变量。
- 报告 OR（比值比）与 95% CI。
- SPSS：分析→回归→二元Logistic；R：`glm(y ~ x, family = binomial, data = dat)`；Python：`statsmodels.formula.api.logit`。
- 示例报告：`OR = 1.85, 95% CI [1.22, 2.81], p = .004`。

## 多重比较问题

- 检验次数越多，假阳性越多：3 组两两比较需 3 次检验，α 膨胀至 ≈ 1−(1−.05)³ ≈ .14。
- 校正方法：
  - **Bonferroni**：α/k（最保守，样本小易漏检）。
  - **Tukey HSD**：全部两两比较专用（ANOVA 事后默认）。
  - **FDR/BH 法**：`p.adjust(p, "BH")`；适合大量检验（组学数据）。
- R：`p.adjust(pvals, method="bonferroni")`；Python：`statsmodels.stats.multitest.multipletests`。

## 效应量与置信区间速查

| 情形 | 效应量 | 惯例阈值（小/中/大） |
|------|--------|---------------------|
| 两组均值差 | Cohen's d | 0.20 / 0.50 / 0.80 |
| ANOVA | η² / partial η² | .01 / .06 / .14 |
| 卡方 | Cramér's V | .10 / .30 / .50 |
| 相关 | r | .10 / .30 / .50 |
| Logistic | OR | 无统一阈值，报告 CI |

95% CI：`均值 ± t_{0.975, df} × SE`。CI 比 p 值信息量更大，审稿人普遍要求报告。

## 常见误区与陷阱

- ❌ 把 Likert 题当作定距直接做参数检验（单题应按定序；多题合成总分可近似定距）。
- ❌ 只看 p 值不看效应量。
- ❌ 把重复测量当独立样本（膨胀样本量、低估 p）。
- ❌ 显著才报告，不显著的检验消失（选择性报告）。
- ❌ p-hacking：不断加被试/换检验直到显著。
- ❌ 正态性检验 p<.05 就直接放弃参数检验（结合样本量判断）。
- ❌ 回归中遗漏交互项或非线性，模型设定错误。
- ❌ 缺失数据处理随意（列表删除导致偏差；报告处理方法：完整案例分析、多重插补、EM）。

## 报告模板（APA 风格段落示例）

> 对两组得分进行了独立样本 t 检验。Levene 检验表明方差齐性成立（F = 0.21, p = .65）。干预组得分（M = 78.4, SD = 9.2）显著高于对照组（M = 70.1, SD = 10.5），t(58) = 3.24, p = .002, d = 0.84, 95% CI [3.15, 13.45]。

## 检查清单

- [ ] 变量类型与设计确认无误，检验选择与决策表一致
- [ ] 正态性、方差齐性已检查并写明结论
- [ ] 使用了正确的 SPSS 菜单路径或 R/Python 代码
- [ ] 报告包含检验统计量、df、p 值、效应量与 95% CI
- [ ] 多重比较已校正
- [ ] 缺失值与异常值处理已说明
- [ ] 统计结论与图表的数字一致
