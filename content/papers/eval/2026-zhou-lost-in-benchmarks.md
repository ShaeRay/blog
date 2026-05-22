---
title: Lost in Benchmarks? Rethinking Large Language Model Benchmarking with Item Response Theory
created: 2026-05-22
modified: 2026-05-22
authors:
  - Zhou, Hongli
  - Huang, Hui
  - Zhao, Ziqing
  - Han, Lvyuan
  - Wang, Huicheng
  - Chen, Kehai
  - Yang, Muyun
  - Bao, Wei
  - Dong, Jian
  - Xu, Bing
  - Zhu, Conghui
  - Cao, Hailong
  - Zhao, Tiejun
year: 2026
venue: arXiv
doi: https://doi.org/10.48550/arXiv.2505.15055
url: https://arxiv.org/abs/2505.15055
pdf: ../../assets/papers/lost-in-benchmarks/paper.pdf
tags:
  - paper
  - llm-evaluation
  - benchmark
  - item-response-theory
  - psn-irt
status: 精读
rating: 4
draft: false
aliases:
  - Lost in Benchmarks
  - PSN-IRT
---

## 论文信息

| 项目        | 内容                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 标题        | Lost in Benchmarks? Rethinking Large Language Model Benchmarking with Item Response Theory                                                                 |
| 作者        | Hongli Zhou, Hui Huang, Ziqing Zhao, Lvyuan Han, Huicheng Wang, Kehai Chen, Muyun Yang, Wei Bao, Jian Dong, Bing Xu, Conghui Zhu, Hailong Cao, Tiejun Zhao |
| 年份        | 2026                                                                                                                                                       |
| 类型        | arXiv preprint                                                                                                                                             |
| DOI / URL | https://doi.org/10.48550/arXiv.2505.15055                                                                                                                  |
|           |                                                                                                                                                            |
| 代码        | https://github.com/Joe-Hall-Lee/PSN-IRT                                                                                                                    |
| 相关主题      | [[llm-evaluation]]、[[benchmark]]、[[item-response-theory]]、[[psychometrics]]                                                                                |
| 阅读依据      | `/Users/shaeray/Downloads/qmd/lost/full.md`                                                                                                                |

## 一句话主题句

这篇论文研究的是 LLM benchmark 排名不一致、强模型区分度不足的问题；它提出 PSN-IRT，把神经网络参数估计和 Item Response Theory 的可解释题目参数结合起来，用来诊断 benchmark 题目质量，并进一步说明可以用 Fisher information 筛出更小但更接近人类偏好的评测集合 [@zhou2026lost]。

## 我为什么读它

- 这篇论文很适合放进 [[llm-evaluation]] 主题下，因为它不是只问“哪个模型分数高”，而是问“这个 benchmark 本身有没有测量能力”。
- 对论文阅读和实验设计有用：它提供了一套把题目拆成 difficulty、discriminability、guessing-rate、feasibility 的诊断框架。
- 对以后做 benchmark 或筛题有启发：总分不是唯一目标，题目能否区分强模型、是否被污染、是否还有 headroom 同样重要。

## 研究问题

作者要解决的问题是：现有 LLM benchmark 被广泛用于模型排名，但不同榜单之间会给出互相冲突的模型排序，而且顶尖模型在许多 benchmark 上分数越来越接近，导致 benchmark 难以真实反映模型能力差异。

现有方法的不足：

- 传统 leaderboard 总分只提供 aggregate performance，无法解释“哪些题目失效”。
- 不同 benchmark 即使测量相似能力，也可能产生不同模型排序。
- 对 frontier LLM 来说，许多题已经太简单，强模型之间缺少可分性。
- benchmark 的题量越来越大，但题量本身不保证测量质量。

这个问题重要，是因为 LLM benchmark 已经承担了模型比较、产品宣传、研究方向判断和资源分配的功能；如果 benchmark 本身不可靠，后续判断都会被带偏。

## 核心贡献

1. 提出 PSN-IRT：用两个独立网络分别估计 model ability 和 item parameters，再用 4PL IRT 公式预测答对概率。
2. 用 PSN-IRT 分析 11 个主流 benchmark、41,871 道题、12 个 LLM 的答题结果，指出当前 benchmark 存在多指标不均衡、难度天花板不足、题目饱和、污染风险和低可行性等问题。
3. 证明基于 Fisher information 选择题目，可以构造更小的 benchmark，并获得更接近人类偏好榜单的排序。

## 方法：它怎么解决问题

### 核心想法

作者把 LLM benchmark 当作心理测量问题：模型像“被试”，题目像“测验项目”。一个好的 benchmark 不应该只看总分，而应该看每道题在不同能力模型之间如何产生响应差异。

### 方法流程

1. 输入：`(Model, Item, Response, Outcome)`，其中 outcome 是模型是否答对。
2. Model network：输入 one-hot 模型标识，输出模型能力 $\theta$。
3. Item network：输入 one-hot 题目标识，输出四个题目参数 $a,b,c,d$。
4. Logistic calculation layer：把 $\theta$ 和 $a,b,c,d$ 放入 4PL IRT 公式，得到答对概率。
5. 训练目标：用 binary outcome 做 cross entropy，让预测概率拟合真实答题结果。
6. 应用：训练后用 model network 估计模型能力，用 item network 诊断题目质量。

### 关键公式或机制

1PL IRT 的基本形式：

$$
P(X = 1 \mid \theta) = \frac{1}{1 + e^{-(\theta - b)}}
$$

PSN-IRT 使用的 4PL 形式：

$$
P(X = 1 \mid \theta) = c + (d - c) \cdot \frac{1}{1 + e^{-a(\theta - b)}}
$$

四个题目参数：

| 参数 | 含义             | 我对它的理解                                               |
| ---- | ---------------- | ---------------------------------------------------------- |
| $a$  | discriminability | 题目区分不同能力模型的能力                                 |
| $b$  | difficulty       | 题目难度；能力等于难度附近时最敏感                         |
| $c$  | guessing-rate    | 模型不真正理解也答对的概率，可能暗示 shortcut 或污染       |
| $d$  | feasibility      | 高能力模型理论上能达到的作答上限，低值可能说明题目本身含糊 |

## 原文图表

### Figure 1. Benchmark 排名不一致与强模型区分度不足

![[assets/papers/lost-in-benchmarks/figure-1-ranking-inconsistencies.jpg]]

> Figure 1. Benchmark 排名不一致与弱区分度示意 [@zhou2026lost]。

我从这张图读到的重点：

- Benchmark 的问题不只是“有误差”，而是会直接影响模型排序。
- 当顶尖模型分数挤在一起时，leaderboard 很容易变成噪声排序。
- 这张图是全文的问题入口：后面 PSN-IRT 的价值就在于解释这些失真来自哪些题目属性。

### Figure 2. PSN-IRT 的训练和应用流程

![[assets/papers/lost-in-benchmarks/figure-2a-psn-irt-training.jpg]]

![[assets/papers/lost-in-benchmarks/figure-2b-psn-irt-application.jpg]]

![[assets/papers/lost-in-benchmarks/figure-2c-item-parameters.jpg]]

> Figure 2. PSN-IRT 用独立网络估计模型能力和题目参数，再通过 IRT 公式预测答题结果 [@zhou2026lost]。

我从这张图读到的重点：

- “Pseudo-Siamese” 的意思不是两个分支共享参数，而是模型分支和题目分支结构相似但独立。
- 神经网络部分负责大规模参数估计，IRT 公式负责保留可解释性。
- 训练完成后，模型能力和题目质量可以分别被拿出来分析，这比单纯预测答对率更有解释力。

### Figure 3. 11 个 benchmark 的题目属性分布

![[assets/papers/lost-in-benchmarks/figure-3a-difficulty-boxplot.jpg]]

![[assets/papers/lost-in-benchmarks/figure-3b-discriminability-boxplot.jpg]]

![[assets/papers/lost-in-benchmarks/figure-3c-guessing-rate-boxplot.jpg]]

![[assets/papers/lost-in-benchmarks/figure-3d-feasibility-boxplot.jpg]]

![[assets/papers/lost-in-benchmarks/figure-3e-leh-bar.jpg]]

![[assets/papers/lost-in-benchmarks/figure-3f-fisher-information-bar.jpg]]

> Figure 3. 11 个 LLM benchmark 的 difficulty、discriminability、guessing-rate、feasibility、LEH 和 Fisher information 分布 [@zhou2026lost]。

我从这组图读到的重点：

- 没有一个 benchmark 在所有维度上都优秀。
- ARC-C、HellaSwag、MMLU 等多选题 benchmark 的 guessing-rate 更值得警惕。
- TheoremQA 和 GPQA Diamond 更难、更有 headroom，但 feasibility 和 discriminability 也会受影响。
- 设计 benchmark 时，“难”不是唯一目标；过难或信息不足的题目可能反而降低测量质量。

### Figure 4. 难度和区分度之间的张力

![[assets/papers/lost-in-benchmarks/figure-4-difficulty-vs-discriminability-scatter.jpg]]

> Figure 4. 不同 benchmark 中 item difficulty 与 discriminability 的关系 [@zhou2026lost]。

我从这张图读到的重点：

- 极易或极难的题通常区分度较低，因为它们无法产生足够的模型差异。
- MATH、GSM8K 这类难度分布相对均衡的数据集更容易获得较高平均区分度。
- GPQA Diamond、TheoremQA 虽然更有挑战性，但如果题目集中在高难区，也可能降低对模型细粒度差异的识别能力。

## 实验设计

| 部分         | 内容                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 数据集       | 11 个 benchmark：ARC-C、BBH、Chinese SimpleQA、GPQA Diamond、GSM8K、HellaSwag、HumanEval、MATH、MBPP、MMLU、TheoremQA |
| 模型         | 12 个 LLM，包括强模型和较弱模型；加入弱模型是为了避免只看高分段导致区分度分析失真                                     |
| 数据形式     | model-item binary response matrix                                                                                     |
| Baseline     | MLE、MCMC、VI、VIBO、Deep-IRT                                                                                         |
| 指标         | ACC、F1、AUC、Kendall's $\tau$                                                                                        |
| 题目质量指标 | difficulty、discriminability、guessing-rate、feasibility、LEH、Fisher information                                     |

## 主要结果

1. PSN-IRT 的预测性能接近 Deep-IRT，但排名可靠性更高。full.md 中 Table 2 显示，PSN-IRT 的 ACC 为 0.7998，F1 为 0.8538，Kendall's $\tau$ 为 1.0000。
2. 更复杂的输入表示没有带来收益。语义 embedding 和 GNN 变体都低于原始 PSN-IRT，说明题目文本语义相似不等于测量属性相似。
3. 当前 benchmark 很难同时满足多种测量质量。Chinese SimpleQA 综合排名最好，但 feasibility 较差；TheoremQA 难度高但 feasibility 最低。
4. 很多 benchmark 难度天花板不够高。作者指出，最高题目难度很少超过 1.0，而顶尖模型能力估计可超过 3.0。
5. Fisher information 适合用来筛题。Table 6 显示，在排除弱模型时，Top 1000 Fisher items 的 Kendall's $\tau$ 可达 0.9048，高于全量题目和随机筛题。

## 作者的结论

作者认为，LLM benchmark 需要从“模型排名工具”转向“测量工具”。一个 benchmark 是否有效，不只取决于题量和平均分，还取决于它是否能提供足够难度、足够区分度、较低猜测率、较高可行性，以及对未来模型能力增长仍保留 headroom。

我同意这个方向。尤其是对于 frontier models，继续扩大题库不一定能提升测量质量；更关键的是题目是否位于模型能力附近、是否能有效区分强模型、是否减少公开题源污染。

## 局限性

作者承认或论文中隐含的局限：

- PSN-IRT 的参数依赖当前训练数据，分析新题目仍需要重新训练或扩展估计流程。
- 方法以 binary outcome 为核心，对开放式长答案、多维评分、过程质量等评价信号覆盖有限。
- 使用 one-hot item id 虽然效果好，但对未见题目的泛化能力不强。
- IRT 的 unidimensionality 假设在多能力、多任务 LLM benchmark 中可能过于简化。
- full.md 中 case study 显示了部分高低参数样例，但对人工验证规模和主观判断标准还可以更细。

## 和我研究/写作的关系

可以引用它支持的观点：

- LLM benchmark 排名存在不一致和低区分度问题。
- Benchmark 总分不足以说明测量质量，需要 item-level diagnostics。
- 题目筛选可以基于 Fisher information，而不是只靠随机抽样或聚类。
- 高 guessing-rate 可以作为潜在污染或 shortcut 的诊断信号。
- 低 feasibility 可能说明问题设计含糊，而不是模型能力不足。

可以借用的方法：

- 把评测样本建成 model-item response matrix。
- 用 IRT 参数诊断题目质量。
- 用 Fisher information 挑选更小、更有测量价值的题集。
- 对 benchmark 做多指标排名，而不是只报平均准确率。

需要继续追的引用：

- [[item-response-theory]]
- [[benchmark-agreement-testing]]
- [[tinybenchmarks]]
- [[llm-as-a-judge]]

## 我的批判性问题

- 如果一个 benchmark 测量多种能力，单一 latent ability $\theta$ 是否会把能力结构压得太扁？
- Guessing-rate 高是否一定指向污染？它也可能来自选项设计、题目模式、常识性 shortcut。
- 对开放生成任务，binary outcome 会不会丢掉答案质量、推理过程和安全性等更细粒度信号？
- PSN-IRT 依赖已有模型响应矩阵；当新模型、新题目快速出现时，如何低成本更新？
- Fisher information 筛出的题目更接近 human preference，但 human preference 榜单本身也有偏好和噪声，这一点需要单独讨论。

## 可摘录原文

> “LLM benchmarks fail to achieve simultaneous excellence across multiple measurements.”

我的解释：benchmark 设计存在多目标 trade-off，不能只优化难度、题量或平均分。

> “Selecting items based on Fisher information consistently produces model rankings with superior alignment to the reference arena ranking.”

我的解释：小而高信息量的题集可能比大而混杂的题集更适合比较强模型。

## 参考文献

[^ref]
