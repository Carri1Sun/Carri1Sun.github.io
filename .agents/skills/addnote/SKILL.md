---
name: addnote
description: 在 Kaiyi's Blog 仓库添加一条随笔（content/notes/<日期>-<slug>.md）。当用户说“添加/记一条随笔”“新建 note”“随手记一下”，或给出一段短内容要求发布到随笔时使用。用脚本生成日期 frontmatter 与稳定锚点。
---

# addnote：添加随笔

在仓库根目录 `/Users/sunkaiyi/Projects/kaiyi-blog` 执行。随笔落到 `content/notes/<YYYY-MM-DD>-<slug>.md`，锚点为 `/notes/#<日期>-<slug>`。

## 1. 从用户输入提取字段

必填：

- `slug`：随笔标识，短、唯一、小写英文与连字符。由内容主题概括，例如 `voice-input-vs-typing`；发布后保持稳定。
- 正文：用户给出的短内容。随笔无标题。

选填：

- `date`：用户指定则用；否则不要传，脚本按站点时区 `+08:00` 填当前时间，并用其中日期做文件名前缀。
- `pinned`：用户要求置顶时才加 `--pinned`。

## 2. 正文

- 原样保留用户的措辞、段落与链接，仅做必要 Markdown 排版。
- 允许为空稿：不传 `--body` 会生成只有 frontmatter 的空模板；用户未给正文时先建稿再简短询问内容。
- 支持多段文字、Markdown 链接和图片；图片用 `/assets/...` 引用，不使用本机绝对路径。

## 3. 执行

```bash
# 正文从文件读（推荐，避免 shell 转义）
npm run new:note -- --slug my-note --body-file /tmp/note.md

# 短正文直接传；--body - 从 stdin 读取
npm run new:note -- --slug my-note --body "一条随笔"

# 置顶
npm run new:note -- --slug my-note --pinned --body "…"
```

先加 `--dry-run` 可只打印将写入的内容，确认无误后去掉再执行。

## 4. 检查清单（必须逐项确认）

1. 脚本输出含 `已创建：` 且退出码为 0；若提示“目标已存在”，换 slug 或询问用户。
2. 文件名为 `<日期>-<slug>.md`，日期前缀与 frontmatter 的 `date` 一致。
3. frontmatter 只有 `date`（可选 `pinned: true`），不要为随笔加 `title`、`categories`、`tags`。
4. 正式随笔不加 `sample: true`；该字段只用于用户要求的测试内容。
5. 使用新文件，不覆盖或删除已有随笔。
6. 向用户报告文件路径与锚点 `/notes/#<日期>-<slug>`。
7. 未改动生成器/模板时不运行 `npm run check` 或 `npm run build`；仅当用户明确要求构建验证时才跑。

## 约束

- 不改已有随笔，除非用户明确要求替换或删除。
- 不直接编辑 `dist/`。
