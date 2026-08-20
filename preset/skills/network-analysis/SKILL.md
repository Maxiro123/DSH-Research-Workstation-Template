---
name: network-analysis
description: 当研究者需要分析关系数据（谁与谁相连、连接的结构如何影响结果）、研究社会网络/合作网络/引用网络/传播网络的结构特征与中心性、进行社区发现、构建与检验 ERGM 统计模型，或需要在 R igraph 与 Gephi 之间选择工作流时，使用本技能。
---

# network-analysis

## 一、何时使用网络分析

社会网络分析（Social Network Analysis, SNA）把研究对象视为**节点**及其**关系**，关注"结构如何塑造行为与结果"。适合使用的情形：
- 数据本质是关系性的：合作、引用、信任、传播、董事会兼任、邮件往来；
- 研究问题涉及位置（谁居于结构中心）、群体（社区/派系）、扩散（信息如何经由结构传播）、同质性（物以类聚）或结构对个体结果的影响（如中心性→绩效）；
- 需要在"个体属性"之外引入"关系情境"解释。

不适合的情形：
- 只有属性数据、没有关系数据（用常规统计）；
- 样本是匿名独立观测、关系不可得或不可靠；
- 研究问题不需要任何结构概念。

**给 AI 助手的建议**：先帮研究者明确三件事——节点是什么（分析单位）、边是什么（何种关系，是否有向/有权重）、网络边界如何界定（整网/自我中心网/二模网）。三者含糊，后续一切指标都会失真。

## 二、核心概念与数据结构

| 概念 | 含义 |
|---|---|
| 节点/顶点（node/vertex） | 行动者（人、组织、论文、国家） |
| 边/关系（edge/tie） | 节点间的连接；可有方向、可有权重 |
| 有向/无向 | 关系是否对称（"信任"有向，"合著"无向） |
| 邻接矩阵（adjacency matrix） | n×n 矩阵，A_ij=1 表示 i→j 相连 |
| 边列表（edge list） | from,to[,weight] 两列/三列数据 |
| 自我中心网络（ego network） | 以某节点为中心、含其一阶邻居 |
| 二模网络（two-mode） | 两类节点（如人与组织）之间的隶属关系 |
| 度（degree） | 节点的连接数；有向分入度/出度 |
| 路径、直径 | 最短路径长度；全网最大最短路径 |
| 巨片（giant component） | 最大的连通子图 |

```text
边列表格式：           邻接矩阵格式：
from,to,weight         A  B  C  D
A,B,1                  A  0  1  1  0
A,C,1                  B  0  0  1  0
B,C,1                  C  0  0  0  1
C,D,1                  D  0  0  0  0
```

## 三、数据收集方法

| 方法 | 说明 | 例子 |
|---|---|---|
| 提名法（name generator） | 请受访者列出有某种关系的人，再问关系属性（name interpreter） | "你常与谁讨论工作问题？（最多5人）" |
| 滚雪球抽样 | 由被提名者继续提名 | 隐蔽群体、难接近人群 |
| 档案/二手数据 | 论文合著、专利、邮件、董事会记录 | 引用网络、合作网络 |
| 网络爬虫/API | 抓取社交平台关系 | Twitter/X 关注、GitHub 贡献 |
| 数字痕迹 | 通话记录、传感器、登录日志 | 移动通信网络 |
| 组织记录 | 项目参与、报销、会议名单 | 组织内协作网络 |

**边界与缺失问题**：必须明确网络边界（如"全公司员工"还是"研发部"）；未响应的提名会造成度偏低的结构性偏误（建议报告应答率并考虑多重插补或加权）；个人—团队—组织多层网络不可简单合并。

## 四、结构指标（描述统计）

- 密度：`D = 2m / [n(n−1)]`（无向简单图；有向为 m/[n(n−1)]）。范围 [0,1]，小群体密度高，大网络密度天然低，**跨规模比较要谨慎**。
- 平均路径长度：`L = Σ_{u≠v} d(u,v) / [n(n−1)]`
- 直径：`max d(u,v)`
- 聚类系数（局部）：`C_i = 2t_i / [k_i(k_i−1)]`（t_i 为经过 i 的三角形数）；全局为三角形数与连通三点组数之比。
- **小世界**（Watts-Strogatz）：与随机图相比聚类系数显著更高、平均路径接近——高 C、低 L。
- **无标度**（scale-free）：度分布服从幂律 `P(k) ~ k^−γ`（γ 多在 2–3），少数枢纽节点拥有大量连接。

```r
library(igraph)
g <- graph_from_data_frame(edges, directed = TRUE, vertices = nodes)
edge_density(g)              # 密度
transitivity(g)              # 全局聚类系数
transitivity(g, type = "local")
mean_distance(g)             # 平均路径
diameter(g)                  # 直径
# 幂律检验（无标度证据）
power.law.fit(degree(g, mode = "all"))
```

## 五、中心性（关键指标）

| 指标 | 公式（未归一化） | 含义 | 解读要点 |
|---|---|---|---|
| 度中心性 | k_i（有向分入/出度） | 直接连接数 | 最直观；"社交活跃度" |
| 介数中心性 | C_B(v) = Σ_{s≠v≠t} σ_st(v)/σ_st | 位于多少最短路径上 | 桥接/信息控制角色 |
| 接近中心性 | C_C(v) = 1 / Σ_u d(v,u) | 到所有节点的平均距离之逆 | 全局可达速度 |
| 特征向量中心性 | Ax = λ_max x（主特征向量） | 连接对象本身也重要 | 与高地位者相连者得分高 |

归一化：度中心性除以 (n−1)；介数除以 (n−1)(n−2)/2；接近乘以 (n−1)。**跨网络比较必须用归一化值**。入度（声望）与出度（影响力/活跃）在传播研究中要分开报告。

```r
degree(g, mode = "all"); degree(g, mode = "in"); degree(g, mode = "out")
betweenness(g, normalized = TRUE)
closeness(g, normalized = TRUE)
eigen_centrality(g)$vector
```

## 六、社区检测

社区 = 内部连接紧密、彼此连接稀疏的节点群。

| 算法 | 思想 | 适用 |
|---|---|---|
| Louvain | 贪婪优化模块度 | 大型网络首选 |
| Walktrap | 随机游走相似性 | 中型网络 |
| Girvan-Newman | 逐步移除高介数边 | 小型网络，可解释强 |
| Infomap | 信息编码压缩 | 有向/加权网络 |
| Label Propagation | 标签传播 | 超大规模、近似快速 |

**模块度** `Q = (1/2m) Σ_ij [A_ij − k_i k_j/(2m)] δ(c_i, c_j)`，范围 [−1,1]；通常 **Q > 0.3** 视为存在可信的社区结构。社区划分是探索性的，须与理论/背景知识对照解释，不要机械报告算法输出。

```r
cl <- cluster_louvain(g)
modularity(cl)              # Q 值
membership(cl)              # 每个节点的社区编号
sizes(cl)                   # 各社区规模
```

## 七、ERGM：对网络结构的统计推断

ERGM（指数随机图模型）回答"哪些局部结构机制显著地驱动了边的生成"：

`P(G) = exp(θ′·g(G)) / κ(θ)`

系数 θ 解释为"该结构出现一个额外单位时，一条边形成的 log-odds 变化"。常用效应项：

| 项 | 检验的机制 |
|---|---|
| edges | 基线密度 |
| mutual | 互惠性（有向） |
| transitive / gwesp | 传递性（"朋友的朋友"） |
| nodematch("gender") | 同质性 |
| degree(k) | 度数偏好 |
| nodecov("income") | 节点属性对边的吸引 |

```r
library(ergm)
net <- as.network(as_adjacency_matrix(g, sparse = FALSE), directed = TRUE)
set.vertex.attribute(net, "gender", V(g)$gender)
fit <- ergm(net ~ edges + mutual + nodematch("gender") + gwesp(0.5, fixed = TRUE))
summary(fit)                 # 系数（log-odds）、SE、显著性
gof_fit <- gof(fit)          # 拟合优度：模拟网络与观察网络的统计量对比
plot(gof_fit)
```

**注意**：项过多或缺失关键项会导致模型**退化**（模拟网络与观察网络严重不符）；gwesp/gwd 项用于处理传递性；务必做 gof 诊断并在论文中报告。

## 八、R + igraph 完整工作流

```r
library(igraph)
# 1. 读入
edges <- read.csv("edges.csv")            # from,to,weight
nodes <- read.csv("nodes.csv")            # name, 属性...
g <- graph_from_data_frame(edges, directed = TRUE, vertices = nodes)
# 2. 清理
g <- simplify(g, remove.multiple = TRUE, remove.loops = TRUE)  # 去重边/自环
g <- delete_vertices(g, degree(g) == 0)   # 删除孤立点
# 3. 描述与中心性（见四、五节）
# 4. 社区（见六节）
# 5. 子图提取（巨片）
comp <- components(g)
giant <- induced_subgraph(g, which(comp$membership == which.max(comp$csize)))
# 6. 可视化
plot(giant, vertex.size = degree(giant) * 2 + 1, vertex.color = membership(cl),
     vertex.label = NA, edge.width = E(giant)$weight,
     layout = layout_with_fr(giant))
# 7. 导出
write_graph(g, "network.graphml", format = "graphml")   # 供 Gephi 使用
```

## 九、Gephi 可视化工作流

| 步骤 | 操作要点 |
|---|---|
| 导入 | File → Open（GEXF/GraphML/CSV）；或分别导入 Node 表与 Edge 表 |
| 数据清洗 | Data Laboratory：去重复边、自环，检查权重，处理孤立节点 |
| 布局 | Layout：大图用 **ForceAtlas2**（调斥力/重力/边的权重影响）；小图用 Fruchterman-Reingold |
| 统计 | Statistics 面板：Average Degree、Network Diameter、**Modularity**、Clustering Coefficient、PageRank |
| 视觉映射 | Partition（按社区着色）；Ranking（按中心性设置节点大小/颜色）；Edge Weight 设粗细 |
| 过滤 | Filters：度数阈值、提取巨片、Top-N 节点、边权重区间 |
| 导出 | Preview 面板调整样式（节点标签、边曲率）后导出高清 PNG/SVG/PDF |

## 十、可视化最佳实践

- 节点大小映射中心性（如度或介数），颜色映射社区，边粗细映射权重，标签只显示关键节点；
- 大网络先提取巨片或过滤低度节点，避免"毛球"（hairball）；
- 布局前固定随机种子，保证可复现；
- 图注必须说明：节点/边含义、方向与权重、布局算法、颜色/大小映射；
- 优先用可交互工具（Gephi 或 R 的 `visNetwork`、`ggraph`）帮助探索，正式论文图用静态高清图。

## 十一、常见误区与陷阱

| 误区 | 正确做法 |
|---|---|
| 忽视方向性与权重 | 先明确关系性质；有向指标（入/出度）分开报告 |
| 跨规模直接比较中心性 | 使用归一化指标并报告网络规模 |
| 把结构相关当因果证据 | 中心性-结果关联需时间设计或统计控制（如 ERGM/纵向数据） |
| 网络边界界定随意 | 明确 population 与抽样，报告应答率与缺失处理 |
| 缺失数据不做处理 | 评估偏误方向，考虑插补或加权 |
| 大图直接用力导向布局 | 先过滤、社区着色、按中心性定大小 |
| 社区数目由算法"自动决定" | 对照背景知识解释，报告 Q 值与敏感性 |
| 忽略时间/多层维度 | 动态网络（时序）与多层网络需专门建模 |
| ERGM 项设置随意、无 gof | 项要有理论依据，报告 gof 诊断 |
| 单案例网络过度解读 | 显著性判断依赖统计模型或重复样本，而非单图目测 |

## 十二、论文报告检查清单

- [ ] 节点/边定义、方向、权重与数据来源
- [ ] 网络边界与抽样设计、应答率/缺失处理
- [ ] 规模（n、m）与密度
- [ ] 度分布（是否幂律/无标度）
- [ ] 中心性结果表（归一化指标）
- [ ] 社区划分、模块度 Q 与算法选择
- [ ] 小世界检验（C、L 与随机基线对比）
- [ ] ERGM 模型项、系数与 gof（若使用）
- [ ] 可视化图与完整图注
- [ ] 敏感性分析（阈值、缺失、权重定义）
- [ ] 对理论/实践的启示与局限
