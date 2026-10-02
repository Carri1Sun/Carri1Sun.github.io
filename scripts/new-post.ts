// 新建文章草稿（content/posts/<slug>.md）。
//
//   npm run new:post -- --title "文章标题" [选项]
//   npm run new -- "文章标题" [文件名]        # 兼容旧用法
//
// 选项：
//   --slug <name>          文件名（URL slug），缺省由标题派生
//   --date "<YYYY-MM-DD HH:mm:ss>"  缺省为站点时区当前时间
//   --categories "A,B"     分类列表，逗号 / 顿号分隔
//   --tags "A,B"           标签列表
//   --excerpt "..."        首页摘要（单行）
//   --description "..."    SEO 描述（单行）
//   --cover orbit|frames|steps|rays|0-3|/assets/...|https://...
//   --body "..."           正文；--body - 从 stdin 读取
//   --body-file <path>     从文件读取正文
//   --dry-run              只打印将要写入的内容，不落盘
//
// 不传 --body / --body-file 时生成空正文模板。

import site from '../site.config.ts';
import {
  flagBool,
  flagString,
  isValidDate,
  normalizeDate,
  nowInTimezone,
  parseArgs,
  quote,
  readBody,
  reportCreated,
  safeSlug,
  singleLine,
  splitList,
  validateCover,
  writeDraft,
  yamlList,
} from './lib/draft.ts';

const HELP = `用法：npm run new:post -- --title "文章标题" [--slug slug] [--date "YYYY-MM-DD HH:mm:ss"]
        [--categories "A,B"] [--tags "A,B"] [--excerpt "..."] [--description "..."]
        [--cover orbit] [--body "..."] [--body-file 路径] [--dry-run]

也支持旧用法：npm run new -- "文章标题" [文件名]`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (flagBool(args, 'help') || flagBool(args, 'h') || args.positionals[0] === '--help') {
    console.log(HELP);
    return;
  }

  const titleFlag = flagString(args, 'title');
  const title = titleFlag ?? args.positionals[0];
  if (!title || !title.trim()) {
    console.error('缺少标题。' + '\n' + HELP);
    process.exitCode = 1;
    return;
  }

  // 用 --title 传标题时，第一个位置参数是 slug；旧用法则是“标题 文件名”。
  const slugInput = flagString(args, 'slug') ?? (titleFlag ? args.positionals[0] : args.positionals[1]) ?? title;
  const slug = safeSlug(slugInput, '文件名');

  const dateInput = flagString(args, 'date') ?? nowInTimezone(site.timezone);
  if (!isValidDate(dateInput)) {
    throw new Error(`--date 格式不合法：${dateInput}（应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss）`);
  }
  const date = normalizeDate(dateInput);

  const categories = splitList(flagString(args, 'categories'));
  const tags = splitList(flagString(args, 'tags'));
  const excerpt = singleLine(flagString(args, 'excerpt') ?? '');
  const description = singleLine(flagString(args, 'description') ?? '');
  const cover = validateCover(flagString(args, 'cover'));
  const body = await readBody(flagString(args, 'body'), flagString(args, 'body-file'));

  const frontmatter = [
    '---',
    `title: ${quote(title)}`,
    `date: ${date}`,
    `author: ${site.author}`,
    ...yamlList('categories', categories),
    ...yamlList('tags', tags),
    `excerpt: ${quote(excerpt)}`,
    ...(description ? [`description: ${quote(description)}`] : []),
    ...(cover ? [`cover: ${cover}`] : []),
    '---',
    '',
  ];

  const content = body
    ? `${frontmatter.join('\n')}${body}\n`
    : `${frontmatter.join('\n')}<!-- 正文从这里开始；分类 / 标签 / 摘要直接改上方 frontmatter -->\n`;

  const dryRun = flagBool(args, 'dry-run');
  const result = await writeDraft('content/posts', `${slug}.md`, content, {
    dryRun,
    expectKeys: ['title', 'date'],
  });

  if (dryRun) {
    console.log(`--- ${result.relative} ---`);
    console.log(result.content);
    console.log('--- end ---');
  }
  reportCreated(result, `/posts/${slug}/`, dryRun);

  const warnings: string[] = [];
  if (!excerpt) warnings.push('excerpt 为空，首页卡片与 RSS 摘要会退化为正文前几句');
  if (categories.length === 0) warnings.push('categories 为空，文章不会出现在任何分类分组里');
  if (warnings.length) {
    console.warn('提示：');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }
}

main().catch((error: unknown) => {
  console.error(`创建文章失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
