// 新建随笔草稿（content/notes/<YYYY-MM-DD>-<slug>.md）。
//
//   npm run new:note -- --slug "short-slug" [选项]
//
// 选项：
//   --slug <name>          随笔标识（永久锚点），缺省用第一个位置参数
//   --date "<YYYY-MM-DD HH:mm:ss>"  缺省为站点时区当前时间；文件名使用其中日期
//   --pinned               置顶展示
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
  readBody,
  reportCreated,
  safeSlug,
  writeDraft,
} from './lib/draft.ts';

const HELP = `用法：npm run new:note -- --slug short-slug [--date "YYYY-MM-DD HH:mm:ss"] [--pinned]
        [--body "..."] [--body-file 路径] [--dry-run]`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (flagBool(args, 'help') || flagBool(args, 'h') || args.positionals[0] === '--help') {
    console.log(HELP);
    return;
  }

  const rawSlug = flagString(args, 'slug') ?? args.positionals[0];
  if (!rawSlug || !rawSlug.trim()) {
    console.error('缺少 --slug。' + '\n' + HELP);
    process.exitCode = 1;
    return;
  }

  const dateInput = flagString(args, 'date') ?? nowInTimezone(site.timezone);
  if (!isValidDate(dateInput)) {
    throw new Error(`--date 格式不合法：${dateInput}（应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss）`);
  }
  const date = normalizeDate(dateInput);
  const isoDate = date.slice(0, 10);

  // 允许传入已带日期前缀的 slug，避免生成 2026-09-19-2026-09-19-foo.md。
  const withoutDate = rawSlug.replace(/^\d{4}-\d{2}-\d{2}[-_ ]?/, '');
  const slug = safeSlug(withoutDate, '--slug');
  const fileName = `${isoDate}-${slug}.md`;

  const body = await readBody(flagString(args, 'body'), flagString(args, 'body-file'));

  const frontmatter = [
    '---',
    `date: ${date}`,
    ...(flagBool(args, 'pinned') ? ['pinned: true'] : []),
    '---',
    '',
  ];

  const content = body ? `${frontmatter.join('\n')}${body}\n` : `${frontmatter.join('\n')}\n`;

  const dryRun = flagBool(args, 'dry-run');
  const result = await writeDraft('content/notes', fileName, content, {
    dryRun,
    expectKeys: ['date'],
  });

  if (dryRun) {
    console.log(`--- ${result.relative} ---`);
    console.log(result.content);
    console.log('--- end ---');
  }
  reportCreated(result, `/notes/#${encodeURIComponent(`${isoDate}-${slug}`)}`, dryRun);
}

main().catch((error: unknown) => {
  console.error(`创建随笔失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
