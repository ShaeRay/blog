---
title: "IRT-Router: Effective and Interpretable Multi-LLM Routing via Item Response Theory"
created: 2026-05-22
modified: 2026-05-22
authors:
  - Song, Wei
  - Huang, Zhenya
  - Cheng, Cheng
  - Gao, Weibo
  - Xu, Bihan
  - Zhao, Guanhao
  - Wang, Fei
  - Wu, Runze
year: 2025
venue: arXiv
doi: https://doi.org/10.48550/arXiv.2506.01048
url: https://arxiv.org/abs/2506.01048
pdf: ../../assets/papers/irt-router/paper.pdf
code: https://github.com/Mercidaiha/IRT-Router
tags:
  - paper
  - llm-routing
  - llm-evaluation
  - item-response-theory
  - multi-llm
status: 精读
rating: 4
draft: false
aliases:
  - IRT-Router
  - MIRT-Router
  - NIRT-Router
---

## 论文信息

| 项目      | 内容                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| 标题      | IRT-Router: Effective and Interpretable Multi-LLM Routing via Item Response Theory                                          |
| 作者      | Wei Song, Zhenya Huang, Cheng Cheng, Weibo Gao, Bihan Xu, Guanhao Zhao, Fei Wang, Runze Wu                                  |
| 年份      | 2025                                                                                                                        |
| 类型      | arXiv preprint                                                                                                              |
| DOI / URL | https://doi.org/10.48550/arXiv.2506.01048                                                                                   |
| 代码      | https://github.com/Mercidaiha/IRT-Router                                                                                    |
| 相关主题  | [[llm-routing]]、[[llm-evaluation]]、[[item-response-theory]]、[[cost-aware-inference]]                                     |
| 阅读依据  | `/Users/shaeray/Downloads/Paper/IRT-Router- Effective and Interpretable Multi-LLM Routing via Item Response Theory/full.md` |

## 一句话主题句

这篇论文研究的是多 LLM 系统里“一个 query 应该交给哪个模型”的路由问题；它提出 IRT-Router，把 LLM 看成有多维能力的被试、把 query 看成有难度和区分度的题目，用 Item Response Theory 预测模型在某个 query 上的表现，再结合成本选择最合适的模型 [@song2025irtrouter]。

## 我为什么读它

- 它是 IRT 从“评测诊断”走向“推理系统调度”的应用案例，和 [[item-response-theory]] 在 LLM 里的用法很直接相连。
- 它把 cost-aware routing 做得可解释：不是只输出一个黑盒分数，而是能解释模型能力、query 难度和路由选择。
- 它能和 [[papers/eval/2026-zhou-lost-in-benchmarks|Lost in Benchmarks]] 放在一起看：前者诊断 benchmark item，本文诊断在线 query 和候选 LLM 的匹配关系。

## 研究问题

作者要解决的问题是：现实应用里有许多能力、价格、延迟不同的 LLM，把所有请求都发给最强模型通常太贵，把所有请求都发给小模型又会损失质量。因此需要一个 router，在性能和成本之间做动态权衡。

现有方法的不足：

- 静态 cascade 类方法会按成本逐级尝试，容易产生无效调用和资源浪费。
- 数据驱动 router 往往只用 BERT 或矩阵分解预测响应质量，缺少专门面向 LLM-query 关系的建模框架。
- 许多 router 只输出预测分数，不解释为什么某个 query 应该交给某个模型。
- 训练集 query 和线上 query 分布不一致，会带来 query cold-start 问题。

这个问题重要，是因为 LLM 产品的真实成本往往发生在推理阶段；如果能把简单请求稳定交给便宜模型、把困难请求交给强模型，就可能同时提高服务质量和成本效率。

## 核心贡献

1. 提出 IRT-Router，把心理测量中的 IRT 框架迁移到多 LLM 路由任务中，显式建模 LLM ability 和 query attributes。
2. 给出两个实现：基于 Multidimensional IRT 的 MIRT-Router，以及带有预定义能力相关向量的 NIRT-Router。
3. 设计 query warm-up 机制，用相似训练 query 的 embedding 调整新 query 表示，缓解线上 query cold-start。
4. 在 20 个 LLM 和 12 个数据集上验证，IRT-Router 在 ID 和 OOD 场景下都取得更高 reward，并提供可解释的能力、难度和路由分析。

## 方法：它怎么解决问题

### 核心想法

作者把 LLM router 改写成一个“测验匹配”问题：LLM 是被试，query 是题目，router 要估计某个 LLM 在某个 query 上答好的概率，再把这个概率和调用成本合成路由分数。

### 方法流程

1. 输入：候选模型集合 $\mathcal{M}$、query 集合 $\mathcal{Q}$、每个 query-model 对的历史表现 $y_{ij}$。
2. 表示：用 embedding model 编码 query，用模型 profile 编码 LLM。
3. 预测：MIRT-Router 或 NIRT-Router 输出 $\hat{\mathcal{P}}(q_i, M_j)$，即模型 $M_j$ 处理 query $q_i$ 的预测表现。
4. 打分：把预测表现和模型固定成本合成 score。
5. 路由：选择 score 最大的模型。
6. 冷启动：对新 query，用训练集中 $k$ 个近邻 query 的 embedding 做 warm-up。

### 关键公式或机制

路由目标：

$$
\mathcal{S}(q_i, M_j) = \alpha \cdot \hat{\mathcal{P}}(q_i, M_j) - \beta \cdot \mathcal{C}(M_j)
$$

$$
M^*(q_i) = \arg\max_{M_j \in \mathcal{M}} \mathcal{S}(q_i, M_j)
$$

MIRT-Router 的交互函数：

$$
\hat{\mathcal{P}}(q_i, M_j) =
\frac{1}{1 + \exp(-\mathbf{a}_i^\top \boldsymbol{\theta}_{M_j} + b_i)}
$$

Warm-up：

$$
\mathbf{e}_{q_i} = (1 - \lambda)\mathbf{e}_{q_i} + \lambda \mathbf{e}^{warm}_{q_i}
$$

我对它的理解：IRT 部分负责把“模型能力”和“query 难度/区分度”拆开，成本项负责把纯性能预测变成真实系统可用的选择策略。$\alpha$ 越大越偏性能，$\beta$ 越大越偏省钱。

## 原文图表

### Figure 1. LLM 价格和性能之间的张力

![[assets/papers/irt-router/figure-1-pricing-vs-performance.jpg]]

> Figure 1. 四个代表性 LLM 的输出价格和在不同数据集上的性能 [@song2025irtrouter]。

我从这张图读到的重点：

- LLM 选择不是单调的“越贵越好”，不同任务上模型的性价比会变。
- Router 的价值来自 task/query-level heterogeneity：如果不同 query 对能力要求不同，固定使用一个模型就是浪费。

### Figure 3. IRT-Router 框架

![[assets/papers/irt-router/figure-3-framework.jpg]]

> Figure 3. IRT-Router 先编码 query 和 LLM，再通过 IRT-based prediction 预测表现，最后结合成本做路由 [@song2025irtrouter]。

我从这张图读到的重点：

- 这不是简单分类器，而是把 LLM profile、query embedding、IRT 预测和 cost optimization 串成一个决策流程。
- 解释性来自中间变量：模型能力、query difficulty、discrimination 和 relevance vector。

### Figure 4/5. 能力和难度的可解释性

![[assets/papers/irt-router/figure-4a-llm-ability-mirt.jpg]]

![[assets/papers/irt-router/figure-5-query-difficulty-math.jpg]]

> Figure 4/5. MIRT-Router 估计的 LLM 多维能力和 MATH query 难度 [@song2025irtrouter]。

我从这组图读到的重点：

- Llama3.1-70B-Instruct 的多维能力整体高于 Llama3.1-8B-Instruct，符合常识。
- GPT-4o Mini + CoT 的平均能力高于 GPT-4o Mini，说明 prompting strategy 可以在能力估计里显现。
- MATH query 的估计 difficulty 和题目 level 一致，是方法解释性的一个 sanity check。

### Figure 6/7. Warm-up 对 query cold-start 的作用

![[assets/papers/irt-router/figure-6a-warmup-alpha-0-8.jpg]]

![[assets/papers/irt-router/figure-6b-warmup-alpha-0-5.jpg]]

![[assets/papers/irt-router/figure-7-warmup-alpha-0-2.jpg]]

> Figure 6/7. 不同 $\alpha$ 设置下，有无 warm-up 的 OOD reward 对比 [@song2025irtrouter]。

我从这组图读到的重点：

- 移除 warm-up 后 reward 下降，尤其 NIRT-Router 更明显。
- 线上路由真正困难的不是训练集拟合，而是 unseen query 的稳定泛化。

## 实验设计

| 部分     | 内容                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 数据集   | 8 个 ID 数据集：MMLU、CMMLU、ACLUE、ARC_C、Hotpot_QA、SQUAD、MATH、MBPP；4 个 OOD 数据集：CEVAL、Commonsense_QA、GSM8K、HumanEval |
| 模型     | 20 个候选 LLM，另用 Claude 3.5 Haiku 20241022 测新 LLM generalization                                                             |
| Baseline | Small LLM、Large LLM、HybridLLM、RouteLLM、RouterBench                                                                            |
| 指标     | Performance、Total Cost、Reward、Top-k routing accuracy、MAE、RMSE、AUC、ACC                                                      |
| 设置     | $\alpha=0.8/0.5/0.2$ 控制性能和成本权重；embedding 默认 `bert-base-uncased`；warm-up 的 $k=5$                                     |

## 主要结果

1. 在 ID 场景中，MIRT-Router / NIRT-Router 的 Performance 约 80.7%，高于只用 GPT-4o 的 77.53%，同时成本只有 GPT-4o 的约 1/30。
2. 在 OOD 场景中，NIRT-Router 在 $\alpha=0.8$ 时达到 87.37% Performance 和 69.32 Reward，高于 RouterBench 的 85.50% 和 67.42。
3. 多 LLM routing 明显优于 binary routing，说明候选模型池的互补性很重要。
4. Top-1 routing accuracy 不高，但作者认为这是因为很多模型性能和成本分数接近，Top-k 更有意义。
5. 对新 LLM 的泛化仍有限：MIRT/NIRT 在 Claude 3.5 Haiku 上 ACC 约 0.67/0.68，说明 LLM cold-start 还没有完全解决。

## 作者的结论

作者认为，IRT-Router 能够用 IRT 的可解释 latent trait 框架改善 LLM routing，在更低成本下取得更高性能，并且 warm-up 可以提升 unseen query 的泛化。

我基本同意这个方向。它最有启发的地方不是“又训练了一个 router”，而是把 router 的决策拆成了模型能力、query 难度和成本偏好三部分。这样后续做系统调试时，可以问清楚到底是 query 被估难了、模型能力估偏了，还是成本函数不合适。

## 局限性

作者承认或论文中隐含的局限：

- 数据主要来自有 ground truth 的 benchmark，query 较短，和真实用户请求分布仍有距离。
- Router 对 $\alpha$ 变化不够敏感，说明成本函数 $\mathcal{C}(M_j)$ 的建模还比较粗。
- 未对 query attributes 和 LLM abilities 之间加入额外先验约束，例如大模型平均能力应高于小模型。
- 对新 LLM 的 cold-start 泛化仍有限，需要 few-shot 或模型相似度 warm-up。
- 用模型 profile embedding 表示 LLM 依赖 profile 质量，附录里也提到这些 profile 经过人工修正，这在真实系统里会带来维护成本。

## 和我研究/写作的关系

可以引用它支持的观点：

- LLM routing 可以被表述成一个 cost-aware measurement problem。
- IRT 不只适合评测 benchmark，也能服务模型选择和推理调度。
- Query difficulty 可以帮助解释为什么某个请求被送到强模型或便宜模型。
- 多模型池 routing 比只在“大模型/小模型”之间二选一更能利用模型互补性。

可以借用的方法：

- 把 `(query, model, response score)` 建成交互矩阵。
- 用多维 ability 表示候选 LLM，用 difficulty/discrimination 表示 query。
- 把性能预测和成本函数分开建模，再用 $\alpha,\beta$ 组合成系统目标。
- 用近邻 query embedding 做线上 query warm-up。

需要继续追的引用：

- [[llm-routing]]
- [[routerbench]]
- [[routellm]]
- [[frugalgpt]]
- [[item-response-theory]]

## 我的批判性问题

- Query embedding 相似是否等于测量属性相似？这个问题和 Lost in Benchmarks 里“文本语义不等于 item parameter 相似”有相同风险。
- 成本被近似成固定 cost，但真实 API 成本与输入/输出 token、缓存、延迟、并发、失败重试都有关，固定成本会不会让路由目标过于简化？
- Performance score 来自 ground truth 评价；如果进入开放式生产 query，缺少标准答案后如何训练和校准 router？
- NIRT 的 relevance vector 需要 LLM 标注能力维度，这会不会把另一个模型的偏见引入 router？
- Top-1 routing accuracy 很低时，怎样区分“候选模型确实等价”和“router 没学准”？

## 可摘录原文

> “How can user queries be effectively routed to the most appropriate LLM?”

我的解释：这篇论文的核心不是评价哪个模型最强，而是把“哪个模型适合当前请求”变成可学习、可解释、可调成本权重的问题。

> “The datasets currently used are common benchmark datasets with ground truth labels.”

我的解释：这句话提醒我，benchmark-based routing 和真实线上 routing 之间仍有分布差异，后续必须接入人类偏好或生产日志。

## 参考文献

[^ref]
