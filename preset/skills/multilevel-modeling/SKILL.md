---
name: multilevel-modeling
description: 当数据存在嵌套结构（学生嵌套于班级、患者嵌套于医院、重复测量嵌套于个体）且需要计算组内相关（ICC）、建立随机截距/随机斜率模型、检验跨层交互时使用本技能，涵盖中心化、模型比较与 R lme4、SPSS 混合模型工作流程。
---

# 多层线性模型（Multilevel Modeling / HLM）

## 何时使用本技能

多层线性模型（也称多层模型、混合效应模型、HLM）用于分析**嵌套/分层数据**。出现以下情形时使用：

- 数据天然分层：学生-班级-学校、患者-医生-医院、员工-公司、居民-社区；
- 重复测量/纵向数据：同一被试多次测量嵌套于个体（可视为两层：测量次-个体）；
- 需要估计**组内相关**（ICC）判断分层是否必要；
- 需要解释组间差异（如班级效应、医院效应）或检验**跨层交互**（如班级氛围调节个体特征的效果）；
- 传统回归因忽视嵌套导致标准误偏小、假阳性率升高。

**不适用**：完全独立抽样（用普通回归即可）；只关心固定效应且组数极少（< 10 组时考虑 GEE 或固定效应模型）。

## 核心概念

| 术语 | 含义 |
| --- | --- |
| 水平 1 (Level-1) | 个体层（学生、患者、测量次） |
| 水平 2 (Level-2) | 组层（班级、医院、个体） |
| 固定效应 | 总体平均效应（回归系数 β） |
| 随机效应 | 组间变异（随机截距、随机斜率） |
| ICC | 组内相关 = 组间方差占总方差的比例 |
| 随机截距模型 | 各组截距不同（基线水平不同） |
| 随机斜率模型 | 各组斜率不同（关系强度不同） |
| 跨层交互 | Level-2 变量调节 Level-1 变量的效应 |
| 中心化 | 减去均值，利于解释与减少共线性 |

## 模型公式化表示

两层模型通常写成"水平 1 + 水平 2"两个方程：

```text
空模型：
  Level-1: Y_ij = β_0j + e_ij          e_ij ~ N(0, σ²)
  Level-2: β_0j = γ_00 + u_0j          u_0j ~ N(0, τ00)
  合并式:  Y_ij = γ_00 + u_0j + e_ij
  ICC = τ00 / (τ00 + σ²)

随机截距模型（加入组内中心化的 Level-1 变量 X）：
  Level-1: Y_ij = β_0j + β_1 X_ij + e_ij
  Level-2: β_0j = γ_00 + u_0j
  合并式:  Y_ij = γ_00 + γ_10 X_ij + u_0j + e_ij

随机斜率模型：
  Level-1: Y_ij = β_0j + β_1j X_ij + e_ij
  Level-2: β_0j = γ_00 + u_0j；β_1j = γ_10 + u_1j
  合并式:  Y_ij = γ_00 + γ_10 X_ij + u_0j + u_1j X_ij + e_ij
  （u_0j 与 u_1j 的协方差即随机部分的截距-斜率相关）

跨层交互（Level-2 变量 W 调节 X 的效应）：
  β_1j = γ_10 + γ_11 W_j + u_1j
  合并式: Y_ij = γ_00 + γ_10 X_ij + γ_01 W_j
               + γ_11 X_ij W_j + u_0j + u_1j X_ij + e_ij
```

- γ₁₁ 是跨层交互系数，显著即表示组情境调节个体层效应；
- 分层方程帮助研究者理解"随机"与"固定"参数的含义，写论文方法部分时也常以此呈现。

## 标准工作流程

### 第 1 步：空模型（Null Model）与 ICC

任何多层分析都从空模型开始：

```r
library(lme4); library(lmerTest)

m0 <- lmer(score ~ 1 + (1 | school), data = dat)
summary(m0)

# ICC（两种方法）
library(performance)
icc(m0)
# 手动：τ00 / (τ00 + σ²)
```

- 输出两个方差：组间方差 τ00（school 截距方差）、组内方差 σ²（残差）；
- **ICC = τ00 / (τ00 + σ²)**；
- **ICC > 0.05–0.10 即有必要用多层模型**；即便 ICC 很小，只要研究组水平效应或做整群随机试验设计，仍必须考虑分层；
- 设计效应 DE = 1 + (n̄ − 1) × ICC，用于整群设计的样本量校正。

### 第 2 步：加入 Level-1 预测变量

```r
# 组内中心化（推荐）：减去本组均值
dat$l1c <- with(dat, x1 - ave(x1, school, FUN = mean))

m1 <- lmer(score ~ l1c + (1 | school), data = dat)
summary(m1)
```

- **组内中心化**：分离"组内效应"与"组间效应"，是检验跨层交互的必要准备；
- **大均值中心化**：减去总体均值，用于 Level-2 变量与截距的解释；
- 不中心化时，Level-1 斜率是组内/组间效应的混合，且易与截距相关。

### 第 3 步：检验随机斜率

```r
m2 <- lmer(score ~ l1c + (1 + l1c | school), data = dat)
anova(m1, m2)     # 似然比检验：p < 0.05 → 斜率存在组间变异
```

- 决策标准：
  - 理论上预期关系强度随组变化（如教师支持的效果因班级而异）→ 放随机斜率；
  - LR 检验显著 → 保留随机斜率；
  - 随机斜率方差估计接近 0 或模型不收敛 → 简化（去掉随机斜率或调整优化器）；
- `(1 + x | g)` 默认同时估计截距-斜率相关，可一并报告。

### 第 4 步：加入 Level-2 变量与跨层交互

```r
# 大均值中心化的组变量
dat$x2_c <- dat$x2 - mean(dat$x2, na.rm = TRUE)

# 主效应模型
m3 <- lmer(score ~ l1c + x2_c + (1 + l1c | school), data = dat)

# 跨层交互：组变量调节个体效应
m4 <- lmer(score ~ l1c * x2_c + (1 + l1c | school), data = dat)
summary(m4)
anova(m3, m4)     # 交互是否显著

# 交互解释：简单斜率（低/中/高组情境）
library(emmeans)
emtrends(m4, ~ x2_c, var = "l1c",
         at = list(x2_c = c(-1, 0, 1)))
```

- 跨层交互 = "slope as outcome"：Level-1 斜率 = γ₁₀ + γ₁₁ × Level-2 变量 + 随机项；
- 组内中心化后，交互系数 γ₁₁ 反映"组情境调节个体内效应"，解释清晰；
- 报告简单斜率并画交互图（如 `interactions::interact_plot`）。

### 第 5 步：模型比较与推断

```r
anova(m0, m1, m2, m3, m4)          # 嵌套模型 LR 检验
# 注意：比较固定效应不同的模型时用 ML 重估
m4_ml <- lmer(score ~ l1c * x2_c + (1 + l1c | school), data = dat, REML = FALSE)
```

- **REML vs ML**：估计方差分量用 REML；比较固定效应结构用 ML（或 `anova` 自动 refit）；
- 报告 AIC/BIC 辅助比较；
- p 值：`lmerTest` 提供 Satterthwaite/Kenward-Roger 近似自由度 p 值（推荐 Kenward-Roger 校正）。

### 第 6 步：结果报告

报告要素：空模型 ICC → 固定效应表（β、SE、p）→ 随机效应方差表（τ00、σ²、斜率方差）→ 模型比较 → 跨层交互简单斜率。伪 R² 用 `performance::r2()`：Marginal R² 只含固定效应，Conditional R² 含固定+随机效应。

## 决策标准速查

| 问题 | 决策 |
| --- | --- |
| 是否需要用多层模型？ | ICC > 0.05–0.10，或数据嵌套、研究组效应 |
| 随机截距 or 随机斜率？ | 理论预期 + LR 检验；斜率方差为 0 则简化 |
| Level-1 变量中心化？ | 检验跨层交互/分离组内外效应 → 组内中心化 |
| Level-2 变量中心化？ | 大均值中心化利于解释截距与交互 |
| 组数多少够？ | 随机截距 ≥ 10–20 组；随机斜率与跨层交互 ≥ 30–50 组（30/30 经验法则：30 组 × 30 个体） |
| 比较固定效应？ | 用 ML 重估后 LR 检验；或 Kenward-Roger 校正 |
| 结局是二分类？ | glmer(..., family = binomial)；ICC 用 logit 近似公式 |
| 收敛警告？ | 缩放变量、换优化器（bobyqa/optimx）、增大 maxfun、简化随机结构 |

## R 常用代码速查

```r
library(lme4); library(lmerTest); library(performance)

lmer(y ~ 1 + (1 | g), data)                 # 空模型
lmer(y ~ x + (1 | g), data)                 # 随机截距
lmer(y ~ x + (1 + x | g), data)             # 随机截距 + 随机斜率
lmer(y ~ x * w + (1 + x | g), data)         # 跨层交互
glmer(y ~ x + (1 | g), family = binomial, data)  # 二分类结局
icc(model); r2(model)                       # ICC 与伪 R²
anova(m1, m2)                               # LR 比较

# 收敛问题处理
lmer(y ~ x + (1 + x | g), data,
     control = lmerControl(optimizer = "bobyqa",
                           optCtrl = list(maxfun = 1e5)))
```

## SPSS 操作要点

- **空模型与 ICC**：Analyze → Mixed Models → Linear；Dependent=score，Fixed 仅含 Intercept（勾选 Include intercept），Random Effects 加入 school（Covariance Type 用 Variance Components）；输出 Covariance Parameters 表中 school 方差 = τ00，Residual = σ²，ICC = τ00/(τ00+σ²)。
- **加入固定效应**：Fixed 中加入协变量；随机效应保持 school；勾选 Estimates of fixed effects。
- **随机斜率**：Random Effects 对话框把 Level-1 变量加入 school 的随机项（Covariance Type 可选 Unstructured 估计截距-斜率协方差，或 VC 只估方差）。
- **跨层交互**：Fixed 中加入两个主效应与乘积项（需先创建乘积变量）；交互的简单效应需手动计算或结合 EM Means。
- **重复测量**：Analyze → Mixed Models → Linear，Subject=个体，Repeated 设定测量时间与协方差类型（UN、AR(1) 等），等价于 R 的纵向随机截距/斜率模型。
- SPSS 混合模型的 p 值基于近似自由度，报告时注明所用方法。

## 常见误区

| 误区 | 后果 | 正确做法 |
| --- | --- | --- |
| 忽略嵌套直接 OLS 回归 | 标准误偏小、假阳性膨胀 | 先算 ICC，再用多层模型 |
| 组数太少（< 10）还做随机效应 | 方差估计不稳、检验不靠谱 | 合并组、用 GEE，或固定效应模型 |
| 用 REML 比较不同固定效应 | LR 检验无效 | ML 重估或用 Kenward-Roger |
| 不中心化就解释跨层交互 | 系数含义混乱、共线性 | 组内中心化 Level-1 变量 |
| 随机斜率方差接近 0 仍保留 | 过拟合、不收敛 | 简化随机结构 |
| 把伪 R² 当普通 R² 解读 | 数值偏小引起误解 | 报告 Marginal/Conditional R² 并说明 |
| 忽略收敛警告直接下结论 | 结果不可信 | 换优化器、缩放变量、简化模型 |

## 纵向数据（重复测量）的特殊处理

重复测量数据是特殊的两层结构：Level-1 = 测量次（时间点），Level-2 = 个体。

```r
# 时间作为 Level-1 变量（线性增长模型），基线时间点设为 0
long$timec <- long$time - 0
grow <- lmer(score ~ timec + (1 + timec | id), data = long)
summary(grow)
```

- 随机截距 = 个体基线水平不同；随机斜率 = 个体变化速度不同；
- 非线性增长可加入 timec²（二次项）或分段线性模型；
- 残差相关：若时间点稀疏，可给残差设 AR(1) 协方差（`nlme::lme(..., correlation = corAR1())`）；
- 报告：基线均值、平均增长率、个体间变异（方差）；
- 缺失随访：混合模型用 ML/REML 天然容忍 MAR 缺失，优于重复测量 ANOVA 的列表删除。

## 论文结果报告示例

> 空模型显示班级间方差 τ00 = 4.32，个体内方差 σ² = 15.68，ICC = 0.216，即学生成绩变异的 21.6% 来自班级差异，需采用多层模型。组内中心化的学习投入显著正向预测成绩（β = 2.35, SE = 0.41, p < 0.001），且该效应存在显著班级间变异（随机斜率方差 = 0.87, LR χ² = 12.4, p = 0.002）。加入班级层面教师支持（大均值中心化）后，跨层交互显著（γ₁₁ = 0.58, SE = 0.21, p = 0.006）：在教师支持高的班级，学习投入对成绩的预测作用更强。

按此模板引导研究者补齐：ICC 与分层必要性 → 固定效应表 → 随机效应方差表 → 模型比较 → 跨层交互简单斜率。

## 交付报告清单

- [ ] 数据嵌套结构说明与组数/每组样本量
- [ ] 空模型 ICC 及其解释
- [ ] 中心化方式说明（组内/大均值）
- [ ] 随机效应结构选择依据（截距/斜率 + LR 检验）
- [ ] 固定效应表（β、SE、p 或 CI）
- [ ] 随机效应方差表（τ00、斜率方差、残差 σ²）
- [ ] 跨层交互：简单斜率与交互图
- [ ] 模型比较（AIC/BIC/LR）与最终模型选择理由
- [ ] 收敛与稳健性说明
