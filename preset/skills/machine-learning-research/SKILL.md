---
name: machine-learning-research
description: 当研究需要构建机器学习模型（数据划分、交叉验证、特征工程、模型选择、调参、类别不平衡、SHAP 解释）或在论文中报告机器学习结果时，使用本技能确保方法学严谨且可复现。
---

# machine-learning-research

## 何时使用本技能

- 研究核心是"用数据预测/分类/排序"，且需要严谨的方法学支撑
- 需要在论文方法部分报告模型选择、验证策略与超参数
- 遇到过拟合、类别不平衡、指标虚高等方法学问题
- 需要用 SHAP 等工具解释黑箱模型
- 不适用：纯描述性统计、无预测目标的回归推断（请走统计推断流程）

## 研究中的机器学习完整流程

```
研究问题 → 数据审计 → 数据划分 → 特征工程 → 模型选择 → 调参 → 评估 → 解释 → 报告
```

三条铁律：

1. **测试集只碰一次**——所有调参、特征选择、模型选择都在训练集（或训练集的交叉验证折）上进行
2. **任何使用标签信息的操作都在划分之后进行**（含缺失值填补中的标签统计）
3. **固定所有随机种子**，并在论文中报告

## 1. 数据划分：train/test split

```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y  # 分类任务必须分层
)
```

| 场景 | 划分策略 |
|---|---|
| 分类 | `stratify=y` 分层抽样，保持类别比例 |
| 时间序列/面板 | 按时间切分（`TimeSeriesSplit`），禁止随机打乱 |
| 同一主体多行 | `GroupShuffleSplit` 按主体分组 |
| 样本量小（<1000） | 减小 test_size，或全部用嵌套交叉验证 |

## 2. 交叉验证

```python
from sklearn.model_selection import StratifiedKFold, cross_validate

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_validate(pipe, X_train, y_train, cv=cv,
                        scoring=["f1_macro", "roc_auc"], return_train_score=True)
# 观察 train vs test 得分差，诊断过拟合
```

- **标准 K 折**：默认 5 或 10 折，分类用分层折
- **嵌套交叉验证（nested CV）**：外层折评估泛化、内层折调参，用于"无独立测试集"的小样本研究，给出无偏的模型性能估计
- 永远报告 `mean ± std`，而非单次得分

## 3. 过拟合与欠拟合

| 症状 | 判断 | 对策 |
|---|---|---|
| 训练分远高于验证分 | 过拟合 | 正则化、简化模型、加数据、早停 |
| 两者都低 | 欠拟合 | 更复杂模型、更多特征 |
| 验证分抖动大 | 方差高/样本不足 | 更多数据、减少特征、集成 |

用学习曲线诊断：

```python
from sklearn.model_selection import learning_curve
import numpy as np

sizes, train_s, val_s = learning_curve(
    model, X_train, y_train, cv=5, train_sizes=np.linspace(0.1, 1.0, 8),
    scoring="f1_macro")
# 画图：train 曲线与 val 曲线之间的"沟"= 过拟合程度
```

## 4. 特征工程

```python
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

prep = ColumnTransformer([
    ("num", StandardScaler(), numeric_cols),                    # 数值：标准化（树模型可跳过）
    ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),  # 类别：独热
    ("miss", SimpleImputer(strategy="median"), numeric_cols2),  # 缺失：中位数
])
```

要点：

- **缺失值**：先想机制（缺失本身是否有意义？）再决定填补策略
- **特征选择**：用交叉验证评估，不要只用单变量检验筛特征（单变量筛选会漏掉组合效应）
- **泄漏源**：归一化统计量、目标编码、含未来信息的特征（如"是否违约后"）
- 类别基数高的变量用目标编码或频数编码（配合 CV 防泄漏）

## 5. 模型选择

| 模型 | 适用 | 优点 | 缺点 |
|---|---|---|---|
| 逻辑回归 | 基线、可解释性要求高 | 快、系数可解释、稳健 | 线性假设 |
| 随机森林 | 表格数据通用 | 抗过拟合、特征重要性 | 可解释性一般 |
| GBDT/XGBoost/LightGBM | 结构化数据 SOTA | 精度高、处理非线性 | 易过拟合需调参 |
| SVM | 中小样本、高维 | 核技巧、泛化好 | 大规模慢、难解释 |
| 神经网络 | 图像/文本/大样本 | 表达力强 | 需大数据与调参 |

**工作流建议**：先跑逻辑回归/随机森林作为基线，再上 GBDT；每次只允许"显著且可复现"的提升替换基线。论文中必须报告基线模型对比，不能只报最好模型。

## 6. 超参数调优

```python
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier

param_grid = {
    "n_estimators": [200, 500],
    "max_depth": [5, 10, None],
    "min_samples_leaf": [1, 4, 10],
}
gs = GridSearchCV(RandomForestClassifier(random_state=42), param_grid,
                  cv=5, scoring="f1_macro", n_jobs=-1)
gs.fit(X_train, y_train)
print(gs.best_params_, gs.best_score_)
# 最终评估必须用独立测试集，绝不能引用 gs.best_score_
```

- 网格搜索适合 ≤ 几十组参数；更大空间用 `RandomizedSearchCV`（n_iter=50~100）或 Optuna
- 调参空间先粗后细；报告最优参数与搜索范围
- **只调必要参数**，参数越多越容易在验证集上过拟合

## 7. 类别不平衡

```python
from sklearn.linear_model import LogisticRegression
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

# 方案 A：改损失权重（简单有效）
clf = LogisticRegression(class_weight="balanced")

# 方案 B：SMOTE 过采样（仅在训练集内！）
pipe = ImbPipeline([("smote", SMOTE(random_state=42)), ("clf", clf)])
```

- 评价指标用 **precision / recall / F1（宏平均或按研究目标侧重）与 PR 曲线**，不要只报 accuracy（多数类占 90% 也能拿到 90% 准确率）
- 过采样必须在交叉验证的每一折内部做，否则泄漏
- 报告混淆矩阵，让读者看到错分结构

## 8. 可解释性：SHAP

```python
import shap
explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X_test)

shap.summary_plot(shap_values, X_test)             # 特征重要性概览
shap.force_plot(explainer.expected_value, shap_values[0], X_test.iloc[0])  # 单样本解释
```

- SHAP 给出的是**预测层面的归因**，不是因果效应——论文中要明确措辞
- 对表格数据用 `TreeExplainer`（快）；线性模型用系数即可，不必 SHAP
- 结合特征重要性（gain/permutation）与 SHAP 交叉验证结论

## 9. 论文中的结果报告规范

必报内容清单：

- [ ] 数据集来源、样本量、划分方式与随机种子
- [ ] 预处理与特征工程步骤（含防泄漏声明）
- [ ] 模型族与超参数搜索范围、最终参数
- [ ] 交叉验证设置（折数、分层、嵌套与否）
- [ ] 与基线模型的对比表（均值 ± 标准差）
- [ ] 主要指标 + 混淆矩阵/PR 曲线
- [ ] 特征重要性与 SHAP 解释
- [ ] 局限性：样本偏差、特征泄漏风险、外部效度

**可复现声明模板**："所有实验在 scikit-learn X.Y.Z 下运行，随机种子 42；预处理、模型与调参代码见补充材料/仓库链接。"

## 10. 端到端 scikit-learn 工作流

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.metrics import classification_report

# 1 划分
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2,
                                                    stratify=y, random_state=42)
# 2 定义流水线（全部转换在内部，杜绝泄漏）
pipe = Pipeline([("scaler", StandardScaler()),
                 ("clf", GradientBoostingClassifier(random_state=42))])
# 3 交叉验证调参
cv = StratifiedKFold(5, shuffle=True, random_state=42)
gs = GridSearchCV(pipe, {"clf__max_depth": [3, 5], "clf__n_estimators": [100, 300]},
                  cv=cv, scoring="f1_macro")
gs.fit(X_train, y_train)
# 4 独立测试集最终评估（唯一一次）
y_pred = gs.predict(X_test)
print(classification_report(y_test, y_pred))
```

## 常见陷阱

1. 调参后引用 `GridSearchCV.best_score_` 作为论文指标（它是验证集分数，虚高）
2. 划分前做缩放/填补/过采样 → 泄漏
3. 类别不平衡下只报 accuracy
4. 测试集被反复使用 → 测试集变成第二个验证集
5. 未报告随机种子与库版本 → 不可复现
6. 把 SHAP 归因表述成因果结论
7. 只报最优模型，不报基线 → 说服力不足

## 完成清单

- [ ] 数据划分策略与分层/分组逻辑明确
- [ ] 交叉验证与嵌套 CV 设置合理
- [ ] 特征工程在流水线内完成，无泄漏
- [ ] 模型选择含基线对比
- [ ] 调参范围与最终参数已记录
- [ ] 不平衡处理与合适指标
- [ ] SHAP 解释完成且措辞准确
- [ ] 论文报告含全部必报项与可复现声明
