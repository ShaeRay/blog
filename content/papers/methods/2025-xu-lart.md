---
title: "Latency-Response Theory Model: Evaluating Large Language Models via Response Accuracy and Chain-of-Thought Length"
created: 2026-05-22
modified: 2026-05-22
authors:
  - Xu, Zhiyu
  - Liu, Jia
  - Wang, Yixin
  - Gu, Yuqi
year: 2025
venue: arXiv
doi: https://doi.org/10.48550/arXiv.2512.07019
url: https://arxiv.org/abs/2512.07019
pdf: ../../assets/papers/latency-response-theory/paper.pdf
code: https://github.com/Toby-X/Latency-Response-Theory-Model
tags:
  - paper
  - llm-evaluation
  - item-response-theory
  - chain-of-thought
  - psychometrics
status: 精读
rating: 4
draft: false
aliases:
  - Latency-Response Theory
  - LaRT
---

## 论文信息

| 项目        | 内容                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 标题        | Latency-Response Theory Model: Evaluating Large Language Models via Response Accuracy and Chain-of-Thought Length          |
| 作者        | Zhiyu Xu, Jia Liu, Yixin Wang, Yuqi Gu                                                                                    |
| 年份        | 2025                                                                                                                     |
| 类型        | arXiv preprint                                                                                                           |
| DOI / URL | https://doi.org/10.48550/arXiv.2512.07019                                                                                |
| 代码        | https://github.com/Toby-X/Latency-Response-Theory-Model                                                                  |
| 相关主题      | [[llm-evaluation]]、[[item-response-theory]]、[[chain-of-thought]]、[[computerized-adaptive-testing]]                       |
| 阅读依据      | `/Users/shaeray/Downloads/Paper/Latency-Response Theory Model- Evaluating Large Language Models via Response Accuracy and Chain-of-Thought Length/full.md` |

## 一句话主题句

这篇论文研究的是仅用答题正确率评估 LLM 会丢掉推理过程信息的问题；它提出 Latency-Response Theory Model (LaRT)，联合建模 response accuracy 和 Chain-of-Thought length，用 latent ability、latent speed 以及二者相关系数 $\rho$ 来更稳定地估计模型能力 [@xu2025latency]。

## 我为什么读它

- 它是 IRT-based LLM evaluation 的方法扩展：不只看答对/答错，还把 CoT 长度作为过程信号纳入模型。
- 它和 [[papers/eval/2026-zhou-lost-in-benchmarks|Lost in Benchmarks]] 的问题意识相似：评测不应该只给 leaderboard，还要知道测量信号是否足够。
- 它提供了统计可识别性、渐近方差和 SAEM 估计流程，适合作为“方法型”笔记保存。

## 研究问题

作者要解决的问题是：IRT 已经能用 response accuracy 估计 LLM latent ability，但对 reasoning model 来说，CoT 长度也是重要信号。只看答对/答错会忽略模型是否用了更多 test-time compute、是否在困难题上进行了更长推理。

现有方法的不足：

- 普通 benchmark score 太粗，只把题目当作同等信息量。
- 标准 IRT 只建模 accuracy，不使用 CoT length / response latency。
- 心理测量中已有联合 response accuracy 和 response time 的模型，但直接迁移到 LLM evaluation 时存在可识别性和计算成本问题。
- MCMC 或传统 EM 在大规模 benchmark item pool 上不够高效。

这个问题重要，是因为 reasoning LLM 的能力越来越依赖 test-time compute；如果两个模型答对数量接近，但一个用了更长 CoT 才解决难题，评测方法应该能解释这种差异，而不是只给同分。

## 核心贡献

1. 提出 LaRT：用 probit IRT 建模正确率，用 log-normal 模型建模 CoT length，并用相关系数 $\rho$ 连接 latent ability 和 latent speed。
2. 给出可识别性证明和渐近分析，指出只要 ability 和 speed 相关，LaRT 对 latent ability 的估计精度就优于只看 accuracy 的 IRT。
3. 设计高效 SAEM 估计算法，结合 spectral initialization 和 MAP estimation，避免高成本 MCMC。
4. 在 MATH500、AMC23、AIME24、AIME25 上收集 80+ 开源 LLM 的真实响应，发现能力越强的模型 latent speed 越低，也就是 CoT 更长；且越难的数据集相关性越强。

## 方法：它怎么解决问题

### 核心想法

LaRT 把 LLM 的表现拆成两条观测通道：答题是否正确反映 latent ability，CoT 长度反映 latent speed。两者不是独立的，而是通过 $\rho$ 相关：能力越强的模型，在数学推理任务上往往花更多推理 token，表现为较低 speed / 更长 latency。

### 方法流程

1. 输入：response accuracy matrix $\mathbf{R}$ 和 CoT length matrix $\mathbf{T}$。
2. Accuracy model：用 probit IRT 建模 $R_{ij}$。
3. Latency model：用 log-normal distribution 建模 $\log T_{ij}$。
4. Latent traits：每个 LLM 有 latent ability $\theta_i$ 和 latent speed $\tau_i$。
5. Population parameters：每道题有 accuracy discrimination/difficulty，以及 latency intensity/discrimination/residual variance。
6. Estimation：用 spectral initialization + SAEM 估计 population parameters，再用 MAP 估计 individual latent traits。

### 关键公式或机制

LaRT 的层级模型：

$$
R_{ij} \sim \operatorname{Bernoulli}\left(\Phi(a_j \theta_i + b_j)\right)
$$

$$
\log T_{ij} \sim N(\omega_j - \varphi_j \tau_i, \lambda_j)
$$

$$
(\theta_i,\tau_i)^\top \sim N(0,\boldsymbol{\Sigma}), \quad
\boldsymbol{\Sigma}=
\begin{pmatrix}
1 & \rho \\
\rho & 1
\end{pmatrix}
$$

参数理解：

| 参数 | 含义 | 我对它的理解 |
| ---- | ---- | ------------ |
| $\theta_i$ | latent ability | LLM 的潜在能力 |
| $\tau_i$ | latent speed | CoT 生成速度；越高代表越快、CoT 越短 |
| $a_j$ | accuracy discrimination | 题目能否区分不同能力模型 |
| $b_j$ | difficulty/intercept | 题目正确率难度项，文中也转换成 $-b/a$ 解释 |
| $\omega_j$ | CoT intensity | 题目基础 CoT 需求 |
| $\varphi_j$ | CoT discrimination | CoT 长度对 latent speed 的敏感度 |
| $\lambda_j$ | log-CoT residual variance | CoT 长度噪声 |
| $\rho$ | ability-speed correlation | 能力和速度之间的相关性 |

我对这个模型的理解：标准 IRT 只用 $R_{ij}$，LaRT 额外用 $T_{ij}$。当 $\theta$ 和 $\tau$ 有相关性时，CoT 长度就能反过来帮助估计能力，尤其是在答对/答错已经接近饱和的场景。

## 原文图表

### Figure 1. LaRT 比 IRT 有更低 RMSE

![[assets/papers/latency-response-theory/figure-1-lart-vs-irt-rmse.jpg]]

> Figure 1. 当 $\rho=-0.8$ 时，IRT 和 LaRT 的 RMSE 对比 [@xu2025latency]。

我从这张图读到的重点：

- 在模拟实验里，LaRT 对 $\theta$、$a$、$b$ 的估计误差整体低于 IRT。
- 这支撑了论文的核心统计直觉：只要 CoT 和能力有关，它就不是噪声，而是额外测量信号。

### Figure 3. Latent ability 和 latent speed 的负相关

![[assets/papers/latency-response-theory/figure-3-speed-vs-ability.jpg]]

> Figure 3. 四个数学 benchmark 上 latent speed 与 latent ability 的散点图 [@xu2025latency]。

我从这张图读到的重点：

- 所有数据集上 $\rho$ 都是强负相关：能力越强，latent speed 越低，也就是 CoT 越长。
- 难度越高的数据集，相关性绝对值越大；这说明困难任务更依赖 test-time compute。
- 对简单题，强模型可能能更短地解决；对难题，长 CoT 更可能变成能力信号。

### Figure 4. Accuracy item parameters

![[assets/papers/latency-response-theory/figure-4-accuracy-parameters.jpg]]

> Figure 4. LaRT 估计的 response accuracy discrimination 和 difficulty 分布 [@xu2025latency]。

我从这张图读到的重点：

- 除 AIME25 外，benchmark 越难，accuracy discrimination 平均越高。
- AIME25 对许多小到中型开源模型太难，反而降低了区分力。这和 IRT 里“太难或太易的题都不一定有高信息量”一致。

### Figure 7/8. 置信区间和排名变化

![[assets/papers/latency-response-theory/figure-7-confidence-intervals.jpg]]

![[assets/papers/latency-response-theory/figure-8-ranking-differences-aime25.jpg]]

> Figure 7/8. LaRT 的 latent ability 置信区间，以及 AIME25 上 LaRT 与 IRT 的模型排名差异 [@xu2025latency]。

我从这组图读到的重点：

- 置信区间让 leaderboard 从“排序列表”变成“带统计不确定性的比较”。
- LaRT 和 IRT 的排名会明显不同，差异主要来自答对数量接近但 CoT 长度不同的模型。
- 长 CoT 不会被机械地视为更好，论文例子里 Qwen3-32B 虽然 CoT 更长，但排名没有因此超过其他模型，说明模型还会权衡题目难度和 discrimination。

### Figure 9. Item efficiency

![[assets/papers/latency-response-theory/figure-9-item-efficiency.jpg]]

> Figure 9. LaRT 与 IRT 在 active evaluation 中的 item efficiency 对比 [@xu2025latency]。

我从这张图读到的重点：

- LaRT 用更少题目就能接近全量题目估计的 latent ability。
- 对评测预算有限的场景，CoT length 相当于给每道题增加了一个额外观测维度。

## 实验设计

| 部分     | 内容 |
| -------- | ---- |
| 模拟实验 | 检验 SAEM、MAP 和 LaRT 相比 IRT 的有限样本估计效果 |
| 真实数据 | 80+ 开源 LLM，预处理后 138 个 LLM；数学 benchmark 包括 MATH500、AMC23、AIME24、AIME25 |
| Prompt | zero-shot CoT 和 one-shot CoT；最大输出 token 设为 10,240 |
| Baseline | 标准 IRT |
| 指标 | RMSE、MAE、预测误差、item efficiency、validity、LLM efficiency、置信区间 |
| Active evaluation | 基于 Fisher information 自适应选择下一道题 |

## 主要结果

1. 理论上，当 latent ability 和 latent speed 相关时，LaRT 的 $\theta$ 渐近估计精度高于 IRT；$\rho=0$ 时退化到没有 CoT 信息增益的情况。
2. 模拟实验中，LaRT 对 $\theta$、$a$、$b$ 的 RMSE 普遍低于 IRT，其他参数估计误差随 $N$ 增大而下降。
3. 真实数学数据上，所有 benchmark 都显示 ability 和 speed 强负相关，且难题集上相关性更强。
4. LaRT 在 held-out response prediction 上优于 IRT：平均 MAE 为 0.183，而 IRT 为 0.269。
5. LaRT 的 item efficiency 更好，用更少题目即可估计模型能力。
6. 在 MATH500 五折子集上，LaRT latent ability 方差和为 2.0130，低于 IRT 的 2.3423。
7. LLM 数量较少时，LaRT 对 population parameters 的估计明显更稳，尤其 $N=50$ 时 IRT 容易出现不可用估计。

## 作者的结论

作者认为，LLM evaluation 应该把 response accuracy 和 CoT length 作为联合测量信号。LaRT 在预测能力、item efficiency、validity 和 LLM efficiency 四个方面都优于 IRT，并且为推理模型评测提供了统计可识别、可估计、可解释的框架。

我同意它的基本方向，尤其适用于数学、代码、推理这种 CoT 长度有实际含义的任务。但我会谨慎解释“长 CoT = 更强能力”：长 CoT 有时也可能是绕路、重复或失败前的挣扎。论文在讨论里也承认，未来可能需要 mixture modeling 区分“有效长推理”和“无效长推理”。

## 局限性

作者承认或论文中隐含的局限：

- 真实实验集中在数学推理 benchmark，尚不清楚开放问答、写作、安全评测等任务中 CoT length 是否同样有用。
- CoT 长度只是过程信号的粗略 summary，不能区分正确推理、重复推理和错误推理。
- 模型假设 log-normal CoT length，对极短回答、截断输出、拒答、格式错误等情况可能不稳。
- 评测对象主要是小到中型开源 LLM，未充分检验 frontier reasoning models 的饱和场景。
- LaRT 是一维 latent ability / speed 模型，多能力 benchmark 下可能需要 multidimensional 扩展。

## 和我研究/写作的关系

可以引用它支持的观点：

- LLM 评测可以利用过程信号，而不只是最终答对率。
- CoT length 在数学 reasoning benchmark 中和 latent ability 有系统相关。
- 带置信区间的 latent ability 比裸 leaderboard 排名更适合做严肃比较。
- 当 benchmark 开始饱和时，额外过程信号可能帮助区分答对数量接近的模型。

可以借用的方法：

- 同时保存 binary correctness 和 CoT token length。
- 用 joint IRT-response time 模型分析推理模型。
- 用 Fisher information 做 adaptive item selection。
- 把 ranking comparison 转成 latent ability estimation + uncertainty comparison。

需要继续追的引用：

- [[item-response-theory]]
- [[computerized-adaptive-testing]]
- [[chain-of-thought]]
- [[llm-evaluation]]
- [[benchmark-saturation]]

## 我的批判性问题

- CoT 长度是否真的等于 reasoning effort？对隐藏推理、压缩推理、工具调用或短答强模型，这个 proxy 会失真。
- 长 CoT 可能来自无效搜索或重复输出；LaRT 是否应该区分 correct responses 和 incorrect responses 的 CoT 分布？
- 如果模型供应商隐藏 CoT，只给 summary 或 final answer，这个方法如何落地？
- 在多任务 benchmark 中，一维 $\theta$ 和 $\tau$ 是否会掩盖能力结构？
- 最大输出 token 和 decoding hyperparameters 会影响 CoT 长度；这些设置是否会成为评测结果的混杂变量？

## 可摘录原文

> “Beyond simple response accuracy, LLMs' chain of thought (CoT) lengths serve as a vital indicator of their reasoning ability.”

我的解释：这句话可以用来支持“评测 reasoning model 时过程信号重要”的论点，但引用时要补充 CoT length 只是 proxy。

> “LaRT yields different LLM rankings than IRT.”

我的解释：当评测方法改变观测信号时，leaderboard 排名本身也会改变；这说明排名不是客观常量，而是测量模型的产物。

## 参考文献

[^ref]
