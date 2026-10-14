# Kaiyi's Blog

Kaiyi 的个人博客。不依赖 Hexo 或任何博客框架 —— 用 TypeScript 手写的静态站点生成器把 `content/` 下的 Markdown 构建成纯静态页面，通过 GitHub Actions 发布到 GitHub Pages。

生成器直接以 Node 原生 TypeScript 运行（type stripping，Node 22.18+ / 24，无需编译步骤）；`npm run check` 走 `tsc --noEmit` 严格类型检查。

## 目录结构

```
├── content/
│   ├── posts/          # 博客文章（Markdown + frontmatter）
│   └── about.md        # 关于页
├── assets/             # 样式、脚本、头像、图片（原样复制到站点）
├── scripts/
│   ├── build.ts        # 静态站点生成器
│   ├── templates.ts    # 页面 HTML 模板
│   ├── dev.ts          # 开发服务器（监听 + 热刷新）
│   └── lib/
│       ├── types.ts    # 共享类型定义
│       └── utils.ts    # frontmatter 解析、日期、摘要等工具函数
├── site.config.ts      # 站点信息：标题、简介、导航、社交链接
├── tsconfig.json       # 严格模式类型检查配置（noEmit）
└── dist/               # 构建产物（gitignore，由 CI 部署）
```

## 本地开发

需要 Node 24+。

```bash
pnpm install
pnpm run dev
```

打开 <http://localhost:4000>。修改 `content/`、`assets/`、`scripts/` 下任意文件会自动重建并刷新页面。

点击导航里的「写作」，或打开 <http://localhost:4000/__editor>，即可在本地创建文章和随笔：

1. 选择文章或随笔，填写标题和正文（支持 Markdown）。文章也可以只填标题，创建空稿。
2. 文件名、日期自动填写；需要时展开「更多选项」设置分类、标签、摘要、封面或置顶。
3. 点击「保存并创建文件」，自动生成标准 frontmatter，写入 `content/posts/` 或 `content/notes/`，再点击结果中的预览链接。重名会提示更换文件名，不覆盖已有文件。
4. 确认内容后自行 commit / push，沿用现有 GitHub Pages 发布流程。

输入时会在当前浏览器保存未提交内容，刷新后恢复。保存成功会清空表单。内容目录里的文件会参与下次发布，当前没有草稿过滤功能。

写作入口、编辑页面和写入接口仅由本地开发服务器提供，服务器只监听本机。它们不会写入 `dist/`，GitHub Pages 上不显示，也不提供写入接口。修改开发服务器代码后需要重新运行 `pnpm run dev`。

也可以直接用已有脚本创建空稿，自动生成日期与字段：

```bash
pnpm run new:post --title "文章标题" --slug short-title
pnpm run new:note --slug quick-note --body "随手记下的内容"
```

## 写一篇新文章

在 `content/posts/` 下新建 Markdown 文件，文件名即 URL slug（`agent-plan-design.md` → `/posts/agent-plan-design/`）：

```markdown
---
title: 文章标题
date: 2026-08-28 12:00:00
categories:
  - Agent
tags:
  - AI Agent
excerpt: 一两句话的摘要，展示在首页卡片与 RSS 里。
---

正文从这里开始。
```

`title` 和 `date` 必填；`categories`、`tags`、`excerpt`、`description`（SEO 描述）选填。

## 构建与部署

```bash
npm run build   # 产物在 dist/
```

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会自动构建并把 `dist/` 发布到 <https://carri1sun.github.io>。

## 自定义

- **站点信息**（标题、副标题、导航、页脚、GitHub 链接）：编辑 `site.config.ts`
- **配色与排版**：编辑 `assets/style.css` 顶部的设计令牌（`:root` 与 `[data-theme='dark']`）
- **页面结构**：编辑 `scripts/templates.ts`
- **内置功能**：明暗主题、文章目录（h2/h3）、阅读进度条、代码高亮与复制、Ctrl/Cmd+K 站内搜索、RSS（`/feed.xml`）、sitemap、404 页

## 随笔

在 `content/notes/` 新建 Markdown 文件即可添加随笔，无需标题：

```markdown
---
date: 2026-09-07 12:00:00
---

随手记下的内容，可以使用 Markdown 链接、图片和段落。
```

随笔按时间倒序排列，在 `/notes/` 展示完整列表，首页不展示随笔。文件名作为每条随笔的永久锚点，站内搜索同时收录文章与随笔。

首页展示最近五篇文章，使用标题、介绍和日期组成的朴素列表，不展示标语区。`/archives/` 为按年份分组的完整文章列表。
