// 构建与模板共用的纯函数工具。

import type { PostDate } from './types.ts';

/** HTML 转义（用于模板中插入的动态文本）。 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** 去掉 HTML 标签，保留纯文本。 */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** 常见 HTML 实体还原 + 空白折叠，用于摘要与搜索索引。 */
export function plainText(value: unknown): string {
  return stripTags(String(value))
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** 标题锚点 slug：保留中英文、数字、连字符与下划线。 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '');
}

/** frontmatter 解析结果。 */
export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

/**
 * 极简 frontmatter 解析：覆盖博客用到的 YAML 子集——
 * 标量、引号字符串、行内数组 `[a, b]`、块级列表（`key:` + `  - item`）。
 */
export function parseFrontmatter(raw: unknown): Frontmatter {
  const source = String(raw);
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) return { data: {}, body: source };

  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;

  const pushList = (key: string, value: string): void => {
    const list = Array.isArray(data[key]) ? (data[key] as unknown[]) : [];
    list.push(parseScalar(value));
    data[key] = list;
  };

  for (const line of match[1]?.split(/\r?\n/) ?? []) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listItem = /^-\s+(.*)$/.exec(trimmed);
    if (listItem && currentKey) {
      pushList(currentKey, listItem[1] ?? '');
      continue;
    }

    const pair = /^([\w.-]+):\s*(.*)$/.exec(trimmed);
    if (pair) {
      const key = pair[1] ?? '';
      const value = pair[2] ?? '';
      if (value === '') {
        currentKey = key; // 值为空：可能是块级列表的键，先挂起
        data[key] = null;
      } else {
        currentKey = null;
        data[key] = parseScalar(value);
      }
    }
  }
  return { data, body: source.slice(match[0].length) };
}

function parseScalar(value: string): unknown {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((item) => parseScalar(item))
      .filter((item) => item !== '');
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

/**
 * 把 frontmatter 日期字符串解析成各展示格式。
 * 基于字符串分段而非 Date 本地化，保证任何构建机器时区下输出一致。
 */
export function parseDate(value: unknown, timezone = '+08:00'): PostDate | null {
  const match =
    /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:[T ](?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?)?/.exec(
      String(value ?? '')
    );
  if (!match?.groups) return null;
  const { year = '', month = '', day = '', hour = '00', minute = '00', second = '00' } =
    match.groups;

  const utc = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const offsetLabel = timezone.replace(':', '');

  return {
    raw: String(value),
    iso: `${year}-${month}-${day}`,
    datetime: `${year}-${month}-${day}T${hour}:${minute}:${second}${timezone}`,
    display: `${year} 年 ${+month} 月 ${+day} 日`,
    displayFull: `${year} 年 ${+month} 月 ${+day} 日 ${hour}:${minute}`,
    short: `${month}-${day}`,
    year,
    month,
    time: `${hour}:${minute}`,
    rfc822: `${weekdays[utc.getUTCDay()]}, ${+day} ${months[+month - 1]} ${year} ${hour}:${minute}:${second} ${offsetLabel}`,
    sortKey: `${year}${month}${day}${hour}${minute}${second}`,
  };
}

/** 中英混排字数与阅读时长（中文按字、英文按词，300 字/分钟）。 */
export function readingStats(html: string): { words: number; minutes: number } {
  const text = plainText(html);
  const cjk = (text.match(/[一-鿿぀-ヿ가-힯]/g) ?? []).length;
  const latinWords = (
    text.replace(/[一-鿿぀-ヿ가-힯]/g, ' ').match(/[A-Za-z0-9][\w'’-]*/g) ?? []
  ).length;
  const words = cjk + latinWords;
  return { words, minutes: Math.max(1, Math.round(words / 300)) };
}

/** 截断文本，超出部分以省略号结尾。 */
export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/**
 * 标签页地址：目录名用原始标签（dev 服务器与 GitHub Pages 都按解码后的名字查找，
 * 中文标签因此可直接落成目录），href 一律 encodeURIComponent。
 * 标签里不允许出现 "/"（groupTags 会校验）。
 */
export function tagUrl(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}/`;
}
