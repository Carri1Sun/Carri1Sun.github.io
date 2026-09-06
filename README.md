# Kaiyi's Notes

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
npm install
npm run dev
```

打开 <http://localhost:4000>。修改 `content/`、`assets/`、`scripts/` 下任意文件会自动重建并刷新页面。

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

随笔按时间倒序排列，首页最多展示三张纸片；`/notes/` 展示完整列表，文件名作为每条随笔的永久锚点。示例文件带有 `sample: true`，页面会显示“测试随笔”；写正式内容时移除此字段即可。站内搜索同时收录文章与随笔。

首页文章最多展示三本，`/archives/` 为按年份分组的完整书架。
