// 全站共享的类型定义。

export interface SiteNavItem {
  label: string;
  href: string;
  /** 当前页高亮标记：home / archives / tags / about */
  key: string;
}

export interface SiteConfig {
  title: string;
  author: string;
  subtitle: string;
  description: string;
  keywords: string[];
  lang: string;
  /** frontmatter 日期所属时区，如 '+08:00' */
  timezone: string;
  /** 部署地址，末尾不带斜杠 */
  url: string;
  github: string;
  avatar: string;
  footerSince: number;
  footerNote: string;
  nav: SiteNavItem[];
  /** 首页最多展示的文章数 */
  postsPerPage: number;
}

/** frontmatter 日期解析出的各展示格式（基于字符串分段，构建机器时区无关）。 */
export interface PostDate {
  raw: string;
  /** 2026-08-25 */
  iso: string;
  /** 2026-08-25T01:07:00+08:00（<time datetime> / canonical） */
  datetime: string;
  /** 2026 年 8 月 25 日 */
  display: string;
  /** 2026 年 8 月 25 日 01:07 */
  displayFull: string;
  /** 08-25（归档页） */
  short: string;
  year: string;
  month: string;
  /** HH:mm */
  time: string;
  /** RSS pubDate */
  rfc822: string;
  /** 排序键 */
  sortKey: string;
}

/** 文章目录条目（h2/h3）。 */
export interface TocEntry {
  depth: number;
  id: string;
  text: string;
}

export interface Post {
  slug: string;
  /** 形如 /posts/<slug>/ */
  url: string;
  title: string;
  date: PostDate;
  categories: string[];
  tags: string[];
  excerpt: string;
  description: string;
  html: string;
  toc: TocEntry[];
  words: number;
  minutes: number;
  /** 更早的一篇 */
  prev: Post | null;
  /** 更新的一篇 */
  next: Post | null;
}

export interface AboutPage {
  title: string;
  description: string;
  html: string;
}

export interface ArchiveGroup {
  year: string;
  posts: Post[];
}

/** 标签聚合条目（标签索引页与单标签页共用）。 */
export interface TagGroup {
  tag: string;
  count: number;
  posts: Post[];
}

export interface SitemapEntry {
  path: string;
  date?: PostDate | null;
}

/** 构建结果汇总（CLI 输出用）。 */
export interface BuildResult {
  posts: number;
}
