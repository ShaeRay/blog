---
title: Agent 架构
created: 2026-05-27
modified: 2026-05-27
tags:
  - agent
  - llm-agent
  - agent-architecture
  - tool-use
  - langchain
  - langgraph
  - multi-agent
  - codeact
  - psychometrics
---

这篇会从三个部分展开：Agent的内部架构、Agent的外部关系和心理测量学与Agent的交叉。

## Single Agent

所有的**Agent**本质上都可以抽象为一个循环决策系统，模型读取当前上下文，决定下一步行动，行动产生观察结果，观察结果再写回上下文，直到满足停止条件。

### ReAct

最经典的**Agent**循环结构是`ReAct`（ **Reasoning** 和 **Acting**的组合词），核心是一个**思考 (Thought) - 行动 (Action) - 观察 (Observation)** 的循环。

在现代框架中，`Thought` 往往不显式展示，`Action` 通常表现为模型生成 `tool_call`，`Observation`则表现为`ToolMessage`。

![[assets/notes/agent-architecture/figure-1-react-architecture.jpg]]

> Figure 1. ReAct 用 Thought、Action 和 Observation 串起推理与行动循环 [@yao2022react]。

![[assets/notes/agent-architecture/figure-2-codex-agent-loop.png]]

> Figure 2. Codex Agent Loop 中上下文、工具调用和观察结果的循环关系。图源：OpenAI, Unrolling the Codex Agent Loop。

### Messages

`LangChain`把**Agent**的运行中的消息数据结构定义为以下四种角色，其他**Agent**框架也类似。

| Message 类型  | 作用                                    |
| ------------- | --------------------------------------- |
| SystemMessage | 规定角色、目标、约束                    |
| HumanMessage  | 用户输入                                |
| AIMessage     | 模型输出，可能包含自然语言或 tool calls |
| ToolMessage   | 工具执行结果，返回给模型继续推理        |

带入`ReAct`架构中，用户输入提问，AI调用工具，工具返回结果，AI输出最终结果。

```text
HumanMessage: 帮我查这篇论文
AIMessage: 我要调用 search_tool
ToolMessage: search_tool 返回了搜索结果
AIMessage: 我根据结果继续调用 read_pdf
ToolMessage: read_pdf 返回 PDF 内容
AIMessage: 这是总结
```

参考文档
[菜鸟教程-LangChain消息类型](https://www.runoob.com/langchain/langchain-messages.html)
[LangChainDocs-Agent](https://docs.langchain.com/oss/python/langchain/agents)

![[assets/notes/agent-architecture/figure-3-initial-prompt.png]]

![[assets/notes/agent-architecture/figure-4-tool-call-output.png]]

![[assets/notes/agent-architecture/figure-5-new-turn.png]]

> Figure 3-5. Codex Agent Loop 中 initial prompt、tool call output 和 new turn 的上下文快照。图源：OpenAI, Unrolling the Codex Agent Loop。

关于`system_prompt`和`SystemMessage`，`system_prompt`在`create_agent`初始化就定死，`SystemMessage`可以在`model.invoke()`中传入`message`参数时动态调整。

```python
from langchain.messages import HumanMessage, SystemMessage
from langchain.chat_models import init_chat_model

# 初始化模型
model = init_chat_model("deepseek:deepseek-v4-flash", temperature=0.7)

# 创建 Agent，传入模型和工具列表
agent = create_agent(
    model=model,
    tools=[get_weather, calculate],  # 此处工具函数定义省略
    system_prompt="你是一个乐于助人的助手，会使用工具来回答问题。",
)


# 没有系统指令的回复
messages_no_system = [HumanMessage(content="介绍心理测量学")]
response = model.invoke(messages_no_system)
print(f"无系统指令: {response.content[:80]}...")

# 有系统指令的回复
messages_with_system = [
    SystemMessage(content="你是一个小红书风格的博主，回复要活泼、使用 emoji、带话题标签"),
    HumanMessage(content="介绍心理测量学")
]
response = model.invoke(messages_with_system)
print(f"\n有系统指令: {response.content}")
```

### Tool

在`Agent Loop`中，`LLM`通过调用`tool`与外部世界交互。LLM 看到的不是 Python 函数本身，而是工具的名称、描述和参数结构。在`LangChain`中，将定义好的工具传给 `create_agent()` 的 `tools` 参数，**Agent**就能使用它了。

参考文档
[菜鸟教程-@Tool](https://www.runoob.com/langchain/langchain-tool-basics.html)
[LangChainDocs-Tools](https://docs.langchain.com/oss/python/langchain/tools)

也可以看看`Codex`和`OpenCode`官方的`tool`，在[Codex-Github](https://github.com/openai/codex/blob/9f42c89c/codex-rs/core/src/tools/spec_plan.rs#L1-L86)、[OpenCode-Github](https://github.com/anomalyco/opencode/blob/e85119aa/packages/web/src/content/docs/tools.mdx?plain=1#L181-L330)

[Codex有哪些tool？](https://chat.deepseek.com/a/chat/s/50b08cee-a9b5-4fcb-9465-e0bfed1a3def)
[OpenCode有哪些tool？](https://chat.deepseek.com/a/chat/s/519734a3-16a2-4653-883c-981eb6eae010)

但给 Agent 工具不是越多越好。工具集应该根据任务阶段动态开放。

| 字段          | 说明                       |
| ------------- | -------------------------- |
| name          | 工具名，模型用来选择工具   |
| description   | 告诉模型什么时候用这个工具 |
| args_schema   | 参数结构                   |
| function body | 真正执行的代码             |
| return value  | 返回给模型的观察结果       |

`Tool`的`description`写得不好，`Agent`会选错工具；参数`schema`设计不好，`Agent`会传错参数。

### Hook

Agent loop 会有很多关键节点，在这些节点插入控制逻辑，增加一些额外操作再进入循环非常有必要，以下是`LangChain`划分的6种`Hook`节点。

![[assets/notes/agent-architecture/figure-6-agent-hooks.png]]

> Figure 6. LangChain 在 Agent loop 中暴露的中间件 hook 节点。

比如模型要进行一种危险 bash 操作，最好就在 `wrap_tool_call` 阶段做 `policy check`；如果风险高，就 `human in loop`；真正执行时再进入 `sandbox`。

### LCEL

The **L**ang**C**hain **E**xpression **L**anguage，形式很像R语言的`tidyverse`的管道符操作。上一步的输出，会作为下一步的输入(参数)。

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个心理测量学助教，用简洁中文解释概念。"),
    ("human", "请用一句话解释：{concept}")
])

chain = prompt | model | parser

result = chain.invoke({
    "concept": "计算机化自适应测验 CAT"
})

print(result)
```

![[assets/notes/agent-architecture/figure-7-langchain-lcel.png]]

> Figure 7. LCEL 用 `|` 把 prompt、model、parser 和中间映射组成链式流程。

```python
outline_prompt = ChatPromptTemplate.from_template("""
你是课程设计专家。
请为主题「{topic}」生成一个 5 点教学大纲。
""")

draft_prompt = ChatPromptTemplate.from_template("""
根据下面的主题和大纲，写一段适合课堂讲解的内容。

主题：{topic}

大纲：
{outline}
""")

polish_prompt = ChatPromptTemplate.from_template("""
请把下面这段内容改写得更适合口头分享：
- 逻辑清楚
- 例子具体
- 不要太书面化

内容：
{draft}
""")

outline_chain = outline_prompt | model | parser

full_chain = (
    {
        "topic": itemgetter("topic"),
        "outline": outline_chain
    }
    | draft_prompt
    | model
    | parser
    | RunnableLambda(lambda draft: {"draft": draft})
    | polish_prompt
    | model
    | parser
)

result = full_chain.invoke({
    "topic": "LangChain Agent Loop 和 Hook 机制"
})

print(result)
```

介绍这个是因为，如果大家要做一个确定的`pipeline`，一定要考虑清楚工作的流程以及参数。或者，做一个`SKILL`就行。

### LangGraph

以上介绍的`LangChain`都是确定性流程，适合确定性的链式流程，例如：  
`prompt → model → parser`。 `LangGraph`更适合会反复修改、分支判断、保存状态的复杂工作流。

在论文写作这样的场景不是一条直线，而是一个有状态、可分支、可循环、可中断的工作流。链式执行无法解决这些问题。

```text
写完 Intro 后发现文献不够 → 回去补检索
写完 Method 后发现模型不合理 → 回去改研究设计
写完 Results 后发现结果不支持假设 → 回去重跑模型
Reviewer 批评讨论不充分 → 回去改 Discussion
导师要求补局限性 → 回去修改全文
```

| 概念             | 在论文写作中的意思       |
| ---------------- | ------------------------ |
| State            | 当前论文项目的全部状态   |
| Node             | 一个明确的写作步骤       |
| Edge             | 步骤之间的流转关系       |
| Conditional Edge | 根据当前结果决定下一步   |
| Checkpoint       | 保存中间版本，方便恢复   |
| Interrupt        | 暂停，等待人工确认或修改 |

### CodeAct

现代智能体的性能瓶颈不再是模型质量，而是工具调用开销。一个需要读取表格、筛选数据、计算几个数值并汇总结果的智能体，通常会消耗四到五次工具调用往返，每一步都需要一次，每次调用都是对模型的单独请求。

CodeAct打破了这种循环。它不再要求模型选择工具、等待结果、再选择下一个工具，而是直接给模型一个`execute_code`工具，让它用一个简短的 Python 程序来表达整个计划。原本智能体需要直接调用的工具，现在都以代码的形式暴露在程序内部`call_tool(...)`。模型只需编写一次代码，沙箱运行它，智能体就能获得一个整合后的结果。

频繁调用工具（数据整理、轻量级计算、链式查找、报告生成）的代理受益最大。原本需要五个模型回合才能完成的五步计划，现在只需一个`execute_code`回合即可完成，其中包含一个简短的 Python 脚本，该脚本通过 `<command>` 调用相同的工具`call_tool(...)`。这样可以节省延迟和令牌，并保持推理过程的简洁性和可审计性，因为完整的计划都位于单个代码块中，而不是分散在多个工具调用消息中。

![[assets/notes/agent-architecture/figure-8-codeact.png]]

> Figure 8. CodeAct 将多步工具交互压缩成一次可执行代码行动 [@wang2024executable]。

参考

- [CodeAct in Agent Framework: Faster Agents with Fewer Model Turns](https://devblogs.microsoft.com/agent-framework/codeact-with-hyperlight/)
- Executable Code Actions Elicit Better LLM Agents [@wang2024executable]
- [作者采访](https://mp.weixin.qq.com/s/aZTNIex4n4ZnCsdS0BtfJg)

## Multi Agent

多`Agent`架构最最最重要的就是理清`Agent`之间的关系，到底是中央集权，还是山头林立？

按控制权划分，`Multi Agent`架构有中心化和去中心化两种。

### Supervisor

特点是：有一个主 Agent 统一接收用户任务、拆解任务、调用子 Agent、整合结果。LangChain 文档把这种 subagents 模式描述为：主 Agent，也常被称为 supervisor，把子 Agent 当作工具调用，决定调用哪个子 Agent、传什么输入，以及如何合并结果。

但现在的`Codex`、`OpenCode`等，会通过 `subAgent as a tool`的方式调用`subAgent`来完成一些小任务，我觉得也可以归于这种架构。

还有一种是让`Supervisor`充当`Router`，让它决定调度哪个专家`Agent`。我觉得可以和[[papers/applications/2025-song-irt-router|IRT-Router]]这篇文章结合起来。

但它的缺点就是`Supervisor`容易成为瓶颈，而且子 Agent 主动性较弱。如果 `Supervisor`判断错，整个流程会偏。

```text
User
 ↓
Supervisor Agent
 ├── Research Agent
 ├── Coding Agent
 ├── Writing Agent
 └── Review Agent
```

### Swarm

蜂群模式（Swarm Mode）不依赖中央调度器，每个 Agent 自主决策、隐式协作，天然具备高容错和弹性扩展能力。

每个 Agent 仅依据 **局部环境信息** 和 **简单规则** 进行决策，通过信息素、消息广播或状态共享等方式 **间接通信**，最终在整体层面 **涌现** 出复杂、高效的智能行为。

[Agent Swarm](https://juejin.cn/post/7603575399255949352)

最近看到一个网络安全项目[Pentest Swarm AI](https://github.com/Armur-Ai/Pentest-Swarm-AI)采用了这种架构。每个独立的`Agent`通过`黑板`机制协作，实现所有`Agent`共享攻击情报。

> 攻击情报会有一个0-1的权重值，并随时间衰减。

## References

[^ref]
