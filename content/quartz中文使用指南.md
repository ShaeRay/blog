---
title: Quartz 中文使用指南
created: 2026-05-22
modified: 2026-05-22
tags:
  - quartz
  - guide
---

这篇只讲你用 Obsidian 写笔记之后，Quartz 这边需要知道的部分。

## 这套库怎么工作

Quartz 会读取 `content/` 目录里的 Markdown 文件，把它们构建成一个静态网站。现在这个项目的首页是 [[index|content/index.md]]，论文阅读笔记可以放在 `content/papers/` 或你自己喜欢的文件夹里。

最重要的几个位置：

| 位置               | 用途                                  |
| ------------------ | ------------------------------------- |
| `content/`         | 你的公开笔记，Quartz 只处理这里的内容 |
| `content/index.md` | 网站首页                              |
| `quartz.config.ts` | 站点标题、语言、主题、插件等配置      |
| `quartz.layout.ts` | 页面左右栏、搜索、图谱、目录等布局    |
| `public/`          | 构建结果，不要手动改这里              |

## 日常命令

在项目根目录 `/Users/shaeray/Downloads/quzrtz` 里运行：

```bash
npx quartz build --serve --port 8080
```

然后打开 `http://localhost:8080/` 预览。这个命令会监听文件变化，改完笔记后页面会自动刷新。

正式构建静态文件：

```bash
npx quartz build
```

构建后的网页在 `public/`。如果以后要部署到 GitHub Pages、Cloudflare Pages、Vercel 或 Netlify，通常构建命令就是 `npx quartz build`，输出目录就是 `public`。

检查项目有没有格式或类型问题：

```bash
npm run check
```

## 写笔记时要注意什么

每篇笔记建议放一个 frontmatter，也就是文件最上方的 `---` 区块：

```md
---
title: 论文标题
created: 2026-05-22
modified: 2026-05-22
tags:
  - paper
  - reading
draft: false
---
```

常用字段：

| 字段          | 用途                               |
| ------------- | ---------------------------------- |
| `title`       | 页面标题；不写时 Quartz 会用文件名 |
| `created`     | 创建日期                           |
| `modified`    | 修改日期                           |
| `tags`        | 标签，会生成标签页                 |
| `description` | 社交卡片和搜索摘要                 |
| `aliases`     | 别名，适合放论文简称               |
| `draft: true` | 草稿，不发布                       |

Quartz 已经支持 Obsidian 常用语法，所以你可以继续写：

```md
[[另一篇笔记]]
[[另一篇笔记|显示成这个名字]]
[[另一篇笔记#某个标题]]
![[assets/papers/example/figure-1.png]]
```

## 图片附件怎么放

建议以后按论文单独建附件文件夹：

```text
content/
  papers/
    2024-example-paper.md
  assets/
    papers/
      2024-example-paper/
        figure-1.png
        figure-2.png
```

在论文笔记里引用图片：

```md
![[assets/papers/2024-example-paper/figure-1.png]]
```

或者用普通 Markdown：

```md
![Figure 1. 模型结构图](../assets/papers/2024-example-paper/figure-1.png)
```

你在本地仍然写 Obsidian 图片语法即可。发布时 GitHub Action 会先运行 `npm run prepare:cdn`，把图片复制到 CDN 仓库用的临时目录，并把构建用 Markdown 里的图片地址改成 `https://cdn.shaeray.com/...`。注意：如果你把网站公开，原论文图片通常仍有版权，最好只放必要的小图，并在图注里写清楚来源和版权信息。

## 论文笔记的链接习惯

建议论文笔记之间多用双链，让图谱有意义：

```md
这篇论文解决的是 [[long-context-retrieval]] 问题，方法上接近 [[retrieval-augmented-generation]]。
```

一篇论文可以链接到：

- 研究问题，例如 `[[multi-agent-collaboration]]`
- 方法，例如 `[[contrastive-learning]]`
- 数据集，例如 `[[MMLU]]`
- 你自己的主题页，例如 `[[论文阅读索引]]`

## 隐私和草稿

不想发布的页面有两种处理方式：

1. 在 frontmatter 里写 `draft: true`。
2. 放进 `content/private/`，这个项目的 `quartz.config.ts` 已经忽略 `private`。

如果是还没读完的论文，我建议先用 `draft: true`，读完再改成 `draft: false`。

## 修改网站信息

站点标题、语言、域名在 [quartz.config.ts](/Users/shaeray/Downloads/quzrtz/quartz.config.ts) 里：

```ts
pageTitle: "quzrtz Demo",
locale: "zh-CN",
baseUrl: "localhost:8080",
```

以后正式上线时，把 `baseUrl` 改成你的域名，例如：

```ts
baseUrl: "example.com",
```

不要写 `https://`，Quartz 配置里通常只写域名。

## APA 和引用插件

Quartz 的 `Plugin.Citations()` 已经启用，配置在 [quartz.config.ts](/Users/shaeray/Downloads/quzrtz/quartz.config.ts)。参考文献库是项目根目录的 `bibliography.bib`。

在笔记正文里写 `[@citationKey]`，Quartz 会按 APA 风格渲染文内引用，并在 `[^ref]` 的位置生成参考文献。真正用于 Obsidian 新建笔记的纯模板在 `content/_templates/论文阅读笔记.md`，它默认 `draft: true`，不会发布到网站。

## 我的推荐工作流

1. 在 Obsidian 里打开 `/Users/shaeray/Downloads/quzrtz/content`。
2. 把 Obsidian 的模板目录设为 `_templates`。
3. 每篇论文新建一个 Markdown，放到 `content/papers/`。
4. 图片、PDF 放到 `content/assets/papers/论文短名/`。
5. 套用 `论文阅读笔记` 模板。
6. 本地运行 `npx quartz build --serve --port 8080` 预览。
7. 读完后把 `draft: true` 改成 `draft: false`。
