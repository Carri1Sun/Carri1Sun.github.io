// 新建文章脚手架：
//
//   npm run new "文章标题"            # 文件名由标题派生
//   npm run new "文章标题" my-post   # 指定文件名（即 URL slug）
//
// 生成 content/posts/<slug>.md，预填 title / date（站点时区的当前时间）/ author，
// 保存后 dev 服务器会自动重建，访问 /posts/<slug>/ 预览。

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import site from '../site.config.ts';
import { slugify } from './lib/utils.ts';

const [title, slugArg] = process.argv.slice(2);

if (!title || title === '--help' || title === '-h') {
  console.log('用法：npm run new "文章标题" [文件名]');
  process.exit(title ? 0 : 1);
}

// 文件名：优先用第二个参数，否则由标题派生（slugify 保留中英文、数字与连字符）
const slug = slugify(slugArg ?? title);
if (!slug) {
  console.error('无法从标题派生文件名（标题里没有字母、数字或中文），请显式指定：npm run new "标题" 文件名');
  process.exit(1);
}

/** 站点时区的当前时间，格式与 frontmatter 解析器一致：YYYY-MM-DD HH:mm:ss。 */
function nowInTimezone(timezone: string): string {
  const match = /([+-])(\d{2}):?(\d{2})/.exec(timezone);
  const sign = match?.[1] === '-' ? -1 : 1;
  const hours = Number(match?.[2] ?? 0);
  const minutes = Number(match?.[3] ?? 0);
  const shifted = new Date(Date.now() + sign * (hours * 60 + minutes) * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`,
  ].join(' ');
}

const filePath = path.resolve(import.meta.dirname, '..', 'content', 'posts', `${slug}.md`);
if (existsSync(filePath)) {
  console.error(`已存在同名文章：${path.relative(process.cwd(), filePath)}（如需新文章请换个文件名）`);
  process.exit(1);
}

const frontmatter = [
  '---',
  `title: "${title.replace(/"/g, "'")}"`,
  `date: ${nowInTimezone(site.timezone)}`,
  `author: ${site.author}`,
  'categories: []',
  'tags: []',
  'excerpt: ""',
  '---',
  '',
  '<!-- 从这里开始写作；分类/标签/摘要直接改上面的 frontmatter，格式参考现有文章 -->',
  '',
].join('\n');

await fs.mkdir(path.dirname(filePath), { recursive: true });
await fs.writeFile(filePath, frontmatter);

console.log(`已创建：${path.relative(process.cwd(), filePath)}`);
console.log(`写完后访问 /posts/${slug}/ 预览（dev 服务器会自动重建）。`);
