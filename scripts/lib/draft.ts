// 新建文章 / 随笔草稿的共享工具：时区时间、参数解析、校验与安全写入。
// 由 scripts/new-post.ts 与 scripts/new-note.ts 复用，保证两个入口行为一致。

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import site from '../../site.config.ts';
import { coverPresets } from './cover.ts';
import { parseFrontmatter, slugify } from './utils.ts';

/** 仓库根目录。 */
export const projectRoot = path.resolve(import.meta.dirname, '..', '..');

/** 站点时区的当前时间，格式与 frontmatter 解析器一致：YYYY-MM-DD HH:mm:ss。 */
export function nowInTimezone(timezone: string = site.timezone): string {
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

/** 校验 frontmatter 日期：必须是 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss 且为真实日期。 */
export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return false;
  const [, y = '', mo = '', d = '', h = '00', mi = '00', s = '00'] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === +y &&
    date.getUTCMonth() + 1 === +mo &&
    date.getUTCDate() === +d
  );
}

/** 把日期补全为 HH:mm:ss（保留原时区语义，仅补齐缺省时间）。 */
export function normalizeDate(value: string): string {
  return value.includes(' ') ? value : `${value} 00:00:00`;
}

export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | boolean>;
}

/** 极简参数解析：支持 `--key value`、`--key=value` 与布尔 `--flag`。 */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    if (token === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq !== -1) {
        flags.set(token.slice(2, eq), token.slice(eq + 1));
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags.set(token.slice(2), next);
          i += 1;
        } else {
          flags.set(token.slice(2), true);
        }
      }
    } else {
      positionals.push(token);
    }
  }
  return { positionals, flags };
}

export function flagString(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === 'string' ? value : undefined;
}

export function flagBool(args: ParsedArgs, name: string): boolean {
  const value = args.flags.get(name);
  return value === true || value === 'true';
}

/** 逗号 / 顿号分隔的列表参数解析，去空去重并保持顺序。 */
export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(/[,，、]/)) {
    const item = raw.trim();
    if (item && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/** 把多行文本折叠为单行，供 excerpt / description 使用（frontmatter 不允许多行值）。 */
export function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** YAML 双引号字符串：解析器不做反转义，因此直接换成单引号避免破坏结构。 */
export function quote(value: string): string {
  return `"${singleLine(value).replace(/"/g, "'")}"`;
}

/** 生成块级 YAML 列表；空列表输出 `key: []`。 */
export function yamlList(key: string, items: string[]): string[] {
  if (!items.length) return [`${key}: []`];
  return [`${key}:`, ...items.map((item) => `  - ${singleLine(item).replace(/"/g, "'")}`)];
}

/** 从文件或字面量读取正文；`-` 表示从 stdin 读取。 */
export async function readBody(body: string | undefined, bodyFile: string | undefined): Promise<string> {
  let text = '';
  if (bodyFile) {
    const filePath = path.resolve(process.cwd(), bodyFile);
    if (!existsSync(filePath)) {
      throw new Error(`--body-file 不存在：${bodyFile}`);
    }
    text = await fs.readFile(filePath, 'utf8');
  } else if (body === '-') {
    text = await readStdin();
  } else if (body !== undefined) {
    text = body;
  }
  return text.replace(/\r\n/g, '\n').replace(/\s*$/, '');
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/** 把 slug 规范为安全文件名：只保留字母、数字、连字符，拒绝空值与首尾连字符。 */
export function safeSlug(input: string, label = 'slug'): string {
  const slug = slugify(input);
  if (!slug) {
    throw new Error(`${label} 为空：请提供包含字母、数字或中文的名称`);
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    throw new Error(`${label} 不能以连字符开头或结尾：${slug}`);
  }
  if (slug.length > 80) {
    throw new Error(`${label} 过长（>80 字符）：${slug}`);
  }
  return slug;
}

/** 校验封面：枚举（含 0–3）或 /assets/ 本地图片或 HTTPS 地址，与构建期 parseCover 规则一致。 */
export function validateCover(cover: string | undefined): string | undefined {
  if (!cover) return undefined;
  const raw = cover.trim();
  if (!raw) return undefined;
  if (coverPresets.some((name, index) => raw === name || raw === String(index))) return raw;
  if (/^https:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/assets/') && !/[\\?#]/.test(raw)) return raw;
  if (raw.startsWith('assets/') && !/[\\?#]/.test(raw)) return `/${raw}`;
  throw new Error(
    `cover 不合法：${raw}。可用 ${coverPresets.join(' / ')}（或 0–3）、/assets/covers/图片名、HTTPS 图片地址`
  );
}

export interface WriteResult {
  path: string;
  relative: string;
}

/**
 * 安全写入草稿：目标已存在则报错；写入后回读并用 parseFrontmatter 自检。
 * `dryRun` 时不落盘，只返回将要写入的内容。
 */
export async function writeDraft(
  dir: string,
  fileName: string,
  content: string,
  options: { dryRun?: boolean; expectKeys?: string[] } = {}
): Promise<WriteResult & { content: string }> {
  const filePath = path.resolve(projectRoot, dir, fileName);
  const relative = path.relative(projectRoot, filePath);

  if (!options.dryRun && existsSync(filePath)) {
    throw new Error(`目标已存在，未覆盖：${relative}（如需新内容请换一个文件名）`);
  }

  const parsed = parseFrontmatter(content);
  if (!Object.keys(parsed.data).length) {
    throw new Error('生成内容缺少有效的 frontmatter，已中止');
  }
  for (const key of options.expectKeys ?? []) {
    if (parsed.data[key] == null || parsed.data[key] === '') {
      throw new Error(`生成内容缺少 frontmatter 字段：${key}`);
    }
  }

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
  return { path: filePath, relative, content };
}

/** 面向 agent 的结果输出：人类可读摘要 + 一行可解析的 OK 记录。 */
export function reportCreated(result: { relative: string }, url: string, dryRun = false): void {
  const prefix = dryRun ? '预览（未写入）' : '已创建';
  console.log(`${prefix}：${result.relative}`);
  console.log(`URL: ${url}`);
  if (!dryRun) {
    console.log('下一步：dev 服务器会自动重建，打开上面的 URL 预览。');
  }
}
