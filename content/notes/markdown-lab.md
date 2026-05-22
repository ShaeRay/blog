---
title: Markdown 实验室
created: 2026-05-22
modified: 2026-05-22
tags:
  - demo
  - markdown
---

这一页用来确认常见 Markdown 能正常渲染。

## 代码块

```ts
type Note = {
  title: string
  tags: string[]
}

const note: Note = {
  title: "Quartz demo",
  tags: ["demo", "markdown"],
}
```

## 表格

| 功能     | 状态   |
| -------- | ------ |
| 搜索     | 已启用 |
| 图谱     | 已启用 |
| 双链     | 已启用 |
| 数学公式 | 已启用 |

## 任务列表

- [x] 克隆 Quartz
- [x] 安装依赖
- [x] 创建 demo 内容
- [ ] 换成你的真实笔记

## 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\sum_{i=1}^{n} i = \frac{n(n + 1)}{2}
$$

## Callout

> [!note]
> 这个 demo 使用 Quartz 默认插件集，所以双链、标签、RSS、站点地图和静态资源处理都已经可用。

相关页面：[[graph-and-backlinks|图谱与反向链接]]。
