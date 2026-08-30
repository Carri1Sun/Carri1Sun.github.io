// 静态站点生成器：content/ 下的 Markdown → dist/ 下的纯静态站点。
//
//   npm run build        构建一次
//   npm run dev          开发模式（带监听与热刷新，见 dev.ts）
//
// 页面结构由 scripts/templates.ts 输出，站点信息来自 site.config.ts。
// 直接用 Node 运行（Node 22.18+/24 原生支持 TS 类型剥离），无需编译步骤。

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Marked, type RendererObject, type Token, type Tokens } from 'marked';
import hljs from 'highlight.js';
import site from '../site.config.ts';
import * as t from './templates.ts';
import {
  escapeHtml,
  parseFrontmatter,
  parseDate,
  readingStats,
  plainText,
  slugify,
  truncate,
  stripTags,
  tagUrl,
} from './lib/utils.ts';
import type {
  AboutPage,
  ArchiveGroup,
  BuildResult,
  Post,
  SitemapEntry,
  TagGroup,
  TocEntry,
} from './lib/types.ts';

const projectRoot = path.resolve(import.meta.dirname, '..');

/* ---------------------------------- Markdown 渲染 ---------------------------------- */

interface HeadingRendererContext {
  parser: { parseInline(tokens: Token[]): string };
}

/** 创建一个渲染器实例；render() 返回 HTML 与目录（h2/h3）信息。 */
function createRenderer() {
  const headings: TocEntry[] = [];
  const usedIds = new Map<string, number>();
  const marked = new Marked({ gfm: true, breaks: false });

  const renderer: RendererObject = {
    code({ text, lang }: Tokens.Code): string {
      const language = (lang ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
      const langClass = language ? ` class="language-${language}"` : '';
      const body =
        language && hljs.getLanguage(language)
          ? hljs.highlight(text, { language }).value
          : escapeHtml(text);
      return `<pre${language ? ` data-lang="${language}"` : ''}><code${langClass}>${body}</code></pre>`;
    },
    heading(this: HeadingRendererContext, { tokens, depth }: Tokens.Heading): string {
      const html = this.parser.parseInline(tokens);
      const text = stripTags(html);
      let id = slugify(text) || `section-${headings.length + 1}`;
      const seen = usedIds.get(id) ?? 0;
      usedIds.set(id, seen + 1);
      if (seen > 0) id = `${id}-${seen}`;

      headings.push({ depth, id, text });
      return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="跳转到此标题">#</a>${html}</h${depth}>`;
    },
  };

  marked.use({ renderer });

  return {
    render(markdown: string): { html: string; toc: TocEntry[] } {
      headings.length = 0;
      usedIds.clear();
      // 未开启 async 选项时 parse 一定是同步返回字符串
      const html = marked.parse(markdown) as string;
      // 目录只收 h2/h3，层级过深反而干扰阅读
      return { html, toc: headings.filter((h) => h.depth === 2 || h.depth === 3) };
    },
  };
}

/* ---------------------------------- 内容加载 ---------------------------------- */

interface Renderer {
  render(markdown: string): { html: string; toc: TocEntry[] };
}

async function loadPosts(renderer: Renderer): Promise<Post[]> {
  const dir = path.join(projectRoot, 'content', 'posts');
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.md'));

  const posts: Post[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const { html, toc } = renderer.render(body);
    const { words, minutes } = readingStats(html);

    const date = parseDate(data.date, site.timezone);
    if (!date) throw new Error(`文章 ${file} 的 frontmatter 缺少可解析的 date 字段`);

    const slug = file.replace(/\.md$/, '');
    const excerpt = data.excerpt
      ? truncate(plainText(data.excerpt), 200)
      : truncate(plainText(/<p>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? ''), 160);

    posts.push({
      slug,
      url: `/posts/${slug}/`,
      title: String(data.title ?? slug),
      date,
      categories: toList(data.categories),
      tags: toList(data.tags),
      excerpt,
      description: plainText(data.description ?? data.excerpt ?? excerpt),
      html,
      toc,
      words,
      minutes,
      prev: null,
      next: null,
    });
  }

  posts.sort((a, b) => b.date.sortKey.localeCompare(a.date.sortKey));
  return posts;
}

function toList(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

async function loadAbout(renderer: Renderer): Promise<AboutPage> {
  const raw = await fs.readFile(path.join(projectRoot, 'content', 'about.md'), 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const { html } = renderer.render(body);
  return {
    title: String(data.title ?? '关于'),
    description: plainText(data.description ?? ''),
    html,
  };
}

/* ---------------------------------- 页面输出 ---------------------------------- */

async function writePage(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

/** 归档页按年份分组（文章已按日期倒序）。 */
function groupByYear(posts: Post[]): ArchiveGroup[] {
  const groups: ArchiveGroup[] = [];
  for (const post of posts) {
    const last = groups.at(-1);
    if (last && last.year === post.date.year) last.posts.push(post);
    else groups.push({ year: post.date.year, posts: [post] });
  }
  return groups;
}

/** 标签聚合：按篇数降序，同篇数按名称排序（Node 自带 ICU，中文按拼音）。 */
function groupTags(posts: Post[]): TagGroup[] {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (tag.includes('/')) throw new Error(`标签含 "/"，无法生成目录：${tag}`);
      const list = map.get(tag);
      if (list) list.push(post);
      else map.set(tag, [post]);
    }
  }
  return [...map.entries()]
    .map(([tag, list]) => ({ tag, count: list.length, posts: list }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'));
}

const livereloadSnippet =
  '<script>(function(){var es=new EventSource("/__livereload");es.onmessage=function(e){if(e.data==="reload")location.reload();};})();</script>';

async function injectLivereload(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const filePath = path.join(entry.parentPath, entry.name);
    const html = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(filePath, html.replace('</body>', `${livereloadSnippet}</body>`));
  }
}

interface BuildOptions {
  outDir?: string;
  livereload?: boolean;
  log?: (message: string) => void;
}

export async function buildSite({
  outDir = 'dist',
  livereload = false,
  log = () => {},
}: BuildOptions = {}): Promise<BuildResult> {
  const dist = path.resolve(projectRoot, outDir);
  const renderer = createRenderer();

  const posts = await loadPosts(renderer);
  const about = await loadAbout(renderer);

  // 上一篇 = 更早的文章，下一篇 = 更新的文章
  const withNeighbors: Post[] = posts.map((post, index) => ({
    ...post,
    prev: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  }));

  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  await writePage(
    path.join(dist, 'index.html'),
    t.homePage(site, posts.slice(0, site.postsPerPage), posts.length)
  );
  await writePage(
    path.join(dist, 'archives', 'index.html'),
    t.archivePage(site, groupByYear(posts))
  );
  await writePage(path.join(dist, 'about', 'index.html'), t.aboutPage(site, about));
  await writePage(path.join(dist, '404.html'), t.notFoundPage(site));

  // 标签索引页 + 每个标签一个目录页（目录名用原始标签，见 utils.tagUrl）
  const tags = groupTags(posts);
  await writePage(path.join(dist, 'tags', 'index.html'), t.tagsIndexPage(site, tags));
  for (const group of tags) {
    await writePage(path.join(dist, 'tags', group.tag, 'index.html'), t.tagPage(site, group));
  }

  for (const post of withNeighbors) {
    await writePage(
      path.join(dist, 'posts', post.slug, 'index.html'),
      t.postPage(site, post, { prev: post.prev, next: post.next })
    );
  }

  await writePage(path.join(dist, 'feed.xml'), t.feedXml(site, posts));
  const sitemapEntries: SitemapEntry[] = [
    { path: '/', date: posts[0]?.date ?? null },
    { path: '/archives/' },
    { path: '/tags/' },
    { path: '/about/', date: parseDate('2026-08-24 00:00:00', site.timezone) },
    ...withNeighbors.map((post) => ({ path: post.url, date: post.date })),
    // 标签页的 lastmod 用该标签下最新一篇的日期
    ...tags.map((group) => ({
      path: tagUrl(group.tag),
      date: group.posts[0]?.date ?? null,
    })),
  ];
  await writePage(path.join(dist, 'sitemap.xml'), t.sitemapXml(site, sitemapEntries));

  await writePage(
    path.join(dist, 'search.json'),
    JSON.stringify(
      withNeighbors.map((post) => ({
        title: post.title,
        url: post.url,
        date: post.date.iso,
        category: post.categories[0] ?? '',
        tags: post.tags,
        excerpt: post.excerpt,
        content: plainText(post.html).slice(0, 20000),
      }))
    )
  );

  await fs.cp(path.join(projectRoot, 'assets'), path.join(dist, 'assets'), { recursive: true });
  await fs.writeFile(path.join(dist, '.nojekyll'), '');

  if (livereload) await injectLivereload(dist);

  log(`✓ ${posts.length} 篇文章，输出到 ${path.relative(projectRoot, dist)}/`);
  return { posts: posts.length };
}

/* ---------------------------------- CLI ---------------------------------- */

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const started = Date.now();
  buildSite({ log: (message) => console.log(message) }).then(() => {
    console.log(`构建完成，用时 ${Date.now() - started}ms`);
  });
}
