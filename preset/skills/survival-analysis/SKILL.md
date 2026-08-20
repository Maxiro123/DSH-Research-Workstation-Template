---
name: survival-analysis
description: 当研究者需要分析事件发生时间（time-to-event）数据，如 Kaplan-Meier 生存曲线、log-rank 检验、Cox 比例风险回归或竞争风险模型时使用本技能，涵盖删失处理、PH 假设检验、HR 解释与 R survival/survminer、SPSS 工作流程。
---

# 生存分析（Survival Analysis）

## 何时使用本技能

生存分析（时间-事件分析）处理**结局 + 发生时间**两类信息，如死亡、复发、疾病进展、出院、设备故障。当出现以下情形时使用：

- 结局是"是否发生某事件"，且记录了两组或多组的**发生时间**；
- 存在**删失**（censoring）：随访结束仍未发生事件、失访、中途退出；
- 需要估计生存率（如 1 年、5 年生存率）或中位生存时间；
- 需要比较组间生存差异（log-rank）或评估多个预测因子的影响（Cox 回归）。

**不适用**：事件是否发生但无时间信息（用 logistic 回归）；所有对象随访期内都发生了事件且时间完整（可退化为普通回归，但通常仍可做生存分析）。

## 核心概念

| 术语 | 含义 |
| --- | --- |
| 生存函数 S(t) | 生存到 t 时刻之后的概率 |
| 风险函数 h(t) | 在 t 时刻仍存活（未发生事件）的个体中，瞬时发生事件的概率 |
| 右删失 | 最常见：随访结束未发生事件、失访、退出 |
| 左删失 | 事件在观察开始前已发生，只知道晚于某时刻 |
| 区间删失 | 事件发生在两次随访之间 |
| 中位生存时间 | S(t) = 0.5 对应的时间点 |
| 风险比 HR | Cox 模型中 exp(β)，两组风险之比 |

## 关键公式

```text
Kaplan-Meier 生存函数（乘积限法）：
Ŝ(t) = Π (1 - d_j / n_j)        对所有 t_j ≤ t
  d_j = t_j 时刻发生事件的人数；n_j = t_j 时刻的风险集人数

生存率 95% CI（Greenwood 方差）：
Var[Ŝ(t)] = Ŝ(t)² × Σ d_j / ( n_j × (n_j - d_j) )

log-rank 检验统计量：
χ² = (ΣO_j - ΣE_j)² / Var(ΣO_j - ΣE_j)
  O = 观察事件数，E = 期望事件数（按合并风险集加权）

Cox 比例风险模型：
h(t | X) = h0(t) × exp(β₁X₁ + β₂X₂ + ...)
  h0(t) 为基线风险函数（不估计，故 Cox 模型称"半参数"模型）
  HR = exp(β)，即协变量每增加一个单位时风险的倍数变化

中位生存时间：S(t) = 0.5 的解，报告其 95% CI
```

## 数据结构示例

| id | time | event | group | age | sex |
| --- | --- | --- | --- | --- | --- |
| 001 | 24.0 | 1 | A | 58 | F |
| 002 | 18.5 | 0 | A | 63 | M |
| 003 | 30.0 | 0 | B | 45 | F |
| 004 | 11.2 | 1 | B | 71 | M |

`time` 单位统一（天/月/年）；`event` = 1 表示观察期内发生事件，0 表示删失（随访到期、失访或退出）。分析前确认：无缺失的 time、event 取值只有 0/1（竞争风险场景可为 0/1/2）、分组变量有明确定义。

## 分析决策流程

```text
时间-事件数据
   │
   ├─ 存在竞争事件？ ────────── 是 → CIF + Fine-Gray / 原因别模型
   │
   ├─ 否：单变量比较 → KM 曲线 + log-rank（多组加两两校正）
   │
   ├─ 多因素分析 → Cox 回归（检查 EPV ≥ 10）
   │        │
   │        ├─ PH 假设成立？ ── 是 → 直接解释 HR
   │        └─ PH 假设违反 ────── → 分层 Cox / 时间依赖协变量
   │
   └─ 报告：中位生存期、各时点生存率、HR + CI、风险集表
```

## 标准工作流程

### 第 1 步：数据结构与编码

- 必需三要素：`time`（时间）、`event`（0=删失 / 1=事件）、分组或协变量；
- 竞争风险场景 event 可编码为 0=删失、1=目标事件、2=竞争事件；
- 检查数据错误：时间 ≤ 0、删失但时间异常等。

### 第 2 步：Kaplan-Meier 生存曲线

```r
library(survival); library(survminer)

fit_km <- survfit(Surv(time, event) ~ group, data = dat)
summary(fit_km)                     # 各时点生存率、风险集人数
print(fit_km)                       # 中位生存时间及 95% CI

ggsurvplot(fit_km, data = dat,
           pval = TRUE,             # 显示 log-rank p 值
           risk.table = TRUE,       # 风险集人数表
           conf.int = TRUE,
           surv.median.line = "hv", # 中位生存时间参考线
           xlab = "随访时间(月)", ylab = "生存概率")
```

- 报告中位生存时间（及 95% CI）与 1/3/5 年生存率；
- 曲线末端风险集人数很少时生存率估计不可靠（阶梯大），慎用最后区间。

### 第 3 步：组间比较 —— log-rank 检验

```r
survdiff(Surv(time, event) ~ group, data = dat)
```

- 零假设：两组生存函数相同；p < 0.05 → 差异显著；
- 多组时 log-rank 给出整体检验，两两比较需校正（如 Bonferroni，或 survminer 的 `pairwise_survdiff`）；
- 对早期差异更敏感的可选 Wilcoxon（Breslow）检验。

### 第 4 步：Cox 比例风险回归

```r
fit_cox <- coxph(Surv(time, event) ~ age + sex + group + bmi, data = dat)
summary(fit_cox)
```

- 输出：每个协变量的 β、HR = exp(β)、95% CI、Wald p；
- 多因素模型中 HR 是"调整后"效应；
- 分类变量需设置参考组（`factor()` 并指定参照）；连续变量可报告每单位或每 10 单位增加的 HR。

### 第 5 步：检验 PH 假设

```r
zph <- cox.zph(fit_cox)
print(zph)      # 每个协变量及整体的 Schoenfeld 残差检验
plot(zph)       # 残差-时间图，曲线应大致水平
```

- 任一协变量 p < 0.05 → 违反 PH 假设；
- 处理办法（按优先级）：
  1. **分层 Cox**：`coxph(Surv(time, event) ~ age + strata(group), data = dat)`，对违反 PH 的变量分层，不再估计其 HR；
  2. **时间依赖协变量**：`coxph(Surv(time, event) ~ age + group + tt(group), tt = function(x, t, ...) x * log(t), data = dat)`；
  3. 分段模型（将随访时间分段，各段估计不同 HR）。

### 第 6 步：竞争风险分析（如有）

当存在"竞争事件"（如研究复发，但患者可能先死亡）时，直接用 KM/Cox 会把竞争事件当删失，从而**高估**目标事件的累积概率：

```r
# 事件编码：0=删失, 1=目标事件(复发), 2=竞争事件(死亡)

# 1) 累计发生函数 CIF（替代 KM 生存曲线）
library(cmprsk)
cif <- cuminc(dat$time, dat$event, group = dat$group)
plot(cif)

# 2) Fine-Gray 亚分布风险模型
fit_fg <- crr(dat$time, dat$event,
              cov1 = model.matrix(~ age + group, data = dat)[, -1])
summary(fit_fg)

# 3) survival 包等价写法（finegray 加权）
library(survival)
fg <- finegray(Surv(time, event) ~ ., data = dat, etype = 1)
fit_fg2 <- coxph(Surv(fgstart, fgstop, fgstatus) ~ age + group, data = fg)
summary(fit_fg2)
```

- 目的不同选择不同模型：**病因/因果研究** → 原因别风险模型（cause-specific，将竞争事件当删失）；**预后/临床决策** → Fine-Gray 亚分布风险模型（估计"最终会发生"的概率）；
- 竞争风险场景下报告 CIF 而非 KM 生存曲线。

### 第 7 步：样本量与报告

- **EPV（每变量事件数）≥ 10**：Cox 模型要求事件数 ≥ 10 × 协变量个数（如 5 个协变量需 ≥ 50 个事件）；
- 报告：各组中位生存时间、1/3/5 年生存率、log-rank p、HR（含 CI）、PH 检验结果、风险集人数表。

## HR 的解读要点

- HR = 1 无差异；HR > 1 风险更高（生存更差）；HR < 1 风险更低（生存更好）；
- **HR 是比率，不是时间倍数**：HR = 2 不代表中位生存时间减半；
- HR 与随访时长相关，跨研究比较时注意随访差异；
- 报告相对效应（HR）时必须配合绝对指标（中位生存时间、生存率）一起解读。

## R 常用代码速查

```r
library(survival); library(survminer)

survfit(Surv(time, event) ~ 1, data)          # 整体生存曲线
survdiff(Surv(time, event) ~ group, data)     # log-rank
coxph(Surv(time, event) ~ x1 + x2, data)      # Cox 回归
cox.zph(fit)                                  # PH 假设检验
ggsurvplot(fit, data, pval = TRUE, risk.table = TRUE)
ggforest(fit_cox)                             # HR 森林图

# 预测特定协变量组合的生存曲线
newd <- data.frame(age = 60, sex = "F", group = "A")
summary(survfit(fit_cox, newdata = newd))
```

## SPSS 操作要点

- **Kaplan-Meier**：Analyze → Survival → Kaplan-Meier；Time=time，Status=event（Define Event=1），Factor=group；Options 勾选生存表与图；Compare Factor 选 log rank。
- **Cox 回归**：Analyze → Survival → Cox Regression；Time/Status 同前，Covariates 放自变量（分类变量点 Categorical 设置参考类）；Options 勾选 CI for exp(B)（默认 95%）。
- **PH 假设的 SPSS 检验**：Cox Regression → "Time-Dependent Covariate" 构造 T_COV（如 T_COV = T_*ln(T_)），加入模型看其是否显著；或画 log-minus-log 生存曲线（Cox 对话框 → Plots → Log minus log）观察各组曲线是否平行。
- SPSS 无内置竞争风险模块（Fine-Gray），需用 R（cmprsk）或 Stata `stcrreg`。

## 论文结果报告示例

> Kaplan–Meier 生存分析显示，A 组中位生存期为 22.4 个月（95% CI 18.9–27.1），B 组为 14.8 个月（95% CI 11.2–19.3）；A、B 组 3 年生存率分别为 58.3% 与 32.5%（log-rank χ² = 9.24, p = 0.002）。多因素 Cox 回归在校正年龄、性别与合并症后显示，B 组的死亡风险为 A 组的 1.78 倍（HR = 1.78, 95% CI 1.31–2.42, p < 0.001）。Schoenfeld 残差检验未发现对比例风险假设的显著违反（各协变量 p > 0.05）。

按此模板引导研究者补齐：生存曲线图（含风险集表）→ 中位生存期 → 各时点生存率 → log-rank → 多因素 HR → PH 假设检验。

## 检查清单（论文报告）

- [ ] 报告删失比例与删失原因（失访率过高需敏感性分析）
- [ ] KM 曲线含风险集人数表（risk table）
- [ ] 报告中位生存时间与 CI、各时点生存率
- [ ] log-rank 检验（或等价检验）及 p 值
- [ ] Cox 模型变量选择依据、HR、95% CI、p
- [ ] PH 假设检验结果（Schoenfeld 残差）及违规处理方式
- [ ] 如有竞争事件：CIF + Fine-Gray/原因别模型的选择说明
- [ ] EPV 检查（事件数 ≥ 10 × 变量数）

## 常见误区

| 误区 | 后果 | 正确做法 |
| --- | --- | --- |
| 把删失当事件（或丢弃删失） | 生存率低估 / 信息浪费 | 正确编码 0/1，保留删失 |
| 用 logistic 回归处理有时间的数据 | 忽略时间与删失 | 用生存分析方法 |
| 不检验 PH 假设直接解释 HR | HR 无意义、误导 | 先 cox.zph，违规则分层/时变 |
| 把 HR 当 RR 解释 | 误读风险大小 | HR 是瞬时风险比，配合绝对指标 |
| 竞争事件当删失处理 | 高估目标事件概率 | CIF + Fine-Gray |
| 事件数太少还放很多协变量 | 过拟合、HR 不稳定 | 控制 EPV ≥ 10 |
| 只看 p 值不看生存曲线 | 忽略临床意义 | p + 中位生存时间 + 曲线一起报告 |
