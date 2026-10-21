// 全站 HTML / XML 模板。所有动态文本经 escapeHtml 转义后输出。

import { escapeHtml as esc, tagUrl } from './lib/utils.ts';
import { icons, stroke } from './lib/icons.ts';
import { Header } from './components/header.ts';
import type {
  AboutPage,
  ArchiveGroup,
  Post,
  Note,
  SiteConfig,
  SitemapEntry,
  TagGroup,
  TocEntry,
} from './lib/types.ts';

const sloganHtml = (text: string): string =>
  esc(text)
    .replace('寿司郎', '<span class="slogan-hand">寿司郎</span>');

/* ---------------------------------- 页面骨架 ---------------------------------- */

interface LayoutPage {
  title: string;
  description: string;
  path: string;
  active: string | null;
  bodyClass: string;
  content: string;
}

// 主题预置脚本：在 CSS 解析前把主题写到 <html data-theme>，避免明暗闪烁。
const themeBoot = `<script>(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();</script>`;

/** 页面骨架。 */
export function layout(site: SiteConfig, page: LayoutPage): string {
  const url = `${site.url}${page.path}`;
  const ogImage = `${site.url}/assets/og.png`;

  return `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="keywords" content="${esc(site.keywords.join(', '))}">
  <meta name="author" content="${esc(site.author)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="${page.active === 'home' ? 'website' : 'article'}">
  <meta property="og:site_name" content="${esc(site.title)}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:locale" content="${esc(site.lang.replace('-', '_'))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <link rel="apple-touch-icon" href="/assets/favicon.png">
  <link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/feed.xml">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <link rel="preload" href="/assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/zcool-qingke-huangyou.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/ibm-plex-sans-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/ibm-plex-sans-sc-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/style.css">
  ${themeBoot}
  <script src="/assets/main.js" defer></script>
</head>
<body class="${esc(page.bodyClass)}">
  <a class="skip-link" href="#main">跳到正文</a>

  ${Header(site, { active: page.active, variant: page.bodyClass === 'page-home' ? 'home' : 'inner' })}

  <main id="main" class="container${page.bodyClass === 'page-post' ? ' container-wide' : ''}">
${page.content}
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© ${site.footerSince} ${esc(site.author)} · ${esc(site.footerNote)}</p>
      <p class="footer-links">
        <a href="${esc(site.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="/feed.xml">RSS</a>
        <a href="/sitemap.xml">Sitemap</a>
      </p>
    </div>
  </footer>

  <div class="search-overlay" id="search-overlay" hidden>
    <div class="search-backdrop" data-search-close></div>
    <div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <h2 class="sr-only" id="search-title">站内搜索</h2>
      <div class="search-input-row">
        <span class="search-input-icon">${icons.search}</span>
        <input id="search-input" type="search" placeholder="搜索文章…" autocomplete="off" spellcheck="false" aria-label="搜索文章" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="search-results" aria-describedby="search-status">
        <button class="search-close" type="button" data-search-close aria-label="关闭搜索" title="关闭搜索">${icons.close}<kbd aria-hidden="true">esc</kbd></button>
      </div>
      <p class="search-status" id="search-status" role="status" aria-live="polite">输入关键词，搜索全站文章</p>
      <ul class="search-results" id="search-results" role="listbox" aria-label="搜索结果"></ul>
      <div class="search-hint"><span>↑↓ 选择</span><span>↵ 打开</span></div>
    </div>
  </div>
</body>
</html>
`;
}

/* ---------------------------------- 首页 ---------------------------------- */

// 使用完整 slug 的码点作为 CSS 标识符，中文和特殊字符也能稳定匹配。
const articleTransition = (post: Post): string =>
  `article-${Array.from(post.slug, (char) => char.codePointAt(0)!.toString(16)).join('-')}`;

function postCard(post: Post, index = 0): string {
  const tags = (post.tags ?? []).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('');
  const category = post.categories.length
    ? `<span class="chip">${esc(post.categories[0] ?? '')}</span>`
    : '';
  const number = String(index + 1).padStart(2, '0');

  return `        <article class="post-card" style="--card-order:${index}">
          <a class="post-card-link" href="${esc(post.url)}">
            <header class="post-card-topline">
              <span class="post-card-index">LOG ${number}</span>
              ${category}
              <span class="post-card-arrow" aria-hidden="true">${icons.arrow}</span>
            </header>
            <h2 class="post-card-title" style="--article-transition:${articleTransition(post)}">${esc(post.title)}</h2>
            <p class="post-card-excerpt">${esc(post.excerpt)}</p>
            <footer class="post-card-footer">
              <div class="post-card-meta">
                <time datetime="${esc(post.date.datetime)}">${esc(post.date.iso)}</time>
                <span class="meta-dot">/</span>
                <span>${post.minutes} MIN</span>
              </div>
              ${tags ? `<div class="post-card-tags">${tags}</div>` : ''}
            </footer>
          </a>
        </article>`;
}

// 首页和归档共用朴素的文章列表。
function articleItem(post: Post): string {
  return `<article class="article-item">
    <h3 class="article-item-title"><a href="${esc(post.url)}">${esc(post.title)}</a></h3>
    <p class="article-item-excerpt">${esc(post.excerpt)}</p>
    <time class="article-item-date" datetime="${esc(post.date.datetime)}">${esc(post.date.iso)}</time>
  </article>`;
}

export function homePage(site: SiteConfig, posts: Post[], total: number): string {
  const content = `    <h1 class="sr-only">${esc(site.title)}</h1>
    <section class="press-library" aria-labelledby="library-title">
      <div class="library-heading"><h2 id="library-title">文章</h2><div class="library-actions"><span>${String(total).padStart(2, '0')} 篇文章</span><a class="library-more" href="/archives/">查看更多文章 ${icons.arrow}</a></div></div>
      <div class="article-list">${posts.map(articleItem).join('\n')}</div>
    </section>`;
  return layout(site, {
    title: site.title, description: `${site.subtitle} ${site.description}`,
    path: '/', active: 'home', bodyClass: 'page-home', content,
  });
}

/* ---------------------------------- 文章页 ---------------------------------- */

function tocHtml(post: Post): string {
  // 子目录归入前一个二级标题；只有三级标题的文章仍可完整导航。
  const groups: { heading: TocEntry; children: TocEntry[] }[] = [];
  for (const heading of post.toc) {
    const parent = groups.at(-1);
    if (heading.depth === 3 && parent?.heading.depth === 2) parent.children.push(heading);
    else groups.push({ heading, children: [] });
  }
  const link = (h: TocEntry): string =>
    `<a class="toc-link toc-lv${h.depth}" href="#${esc(h.id)}"><span class="tree-branch" aria-hidden="true">└</span><span>${esc(h.text)}</span></a>`;
  const items = groups.map(({ heading, children }, index) => `<div class="toc-group">
            <div class="toc-row">${link(heading)}${children.length ? `<button class="toc-group-toggle" type="button" aria-label="收起 ${esc(heading.text)} 的子目录" aria-expanded="true" aria-controls="toc-children-${index}"><span aria-hidden="true">⌄</span></button>` : ''}</div>
            ${children.length ? `<div class="toc-children" id="toc-children-${index}">${children.map(link).join('\n')}</div>` : ''}
          </div>`).join('\n');
  return `      <aside class="toc" aria-label="阅读导航">
        <a class="toc-title" href="#post-title" tabindex="-1" aria-hidden="true">${esc(post.title)}</a>
        <div class="toc-menu">
          <div class="toc-menu-header"><p class="rail-label">${items ? '目录 / TREE' : '阅读 / READ'}</p><button class="toc-mode-toggle" type="button" data-reading-mode-toggle aria-label="隐藏阅读栏，进入沉浸阅读" aria-pressed="false" title="沉浸阅读">${stroke('<polyline points="12 5 5 12 12 19"/><line x1="5" y1="12" x2="21" y2="12"/>')}</button></div>
          ${items ? `<nav class="toc-nav" aria-label="文章目录">${items}</nav>` : ''}
        </div>
        <div class="reading-progress" role="progressbar" aria-label="阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <span class="progress-cells" aria-hidden="true"><b></b><span>${'░'.repeat(28)}</span></span>
          <span class="progress-percent" aria-hidden="true">00%</span>
        </div>
        <p class="reading-hint">按 <kbd>↑</kbd> / <kbd>↓</kbd> 滚动阅读</p>
        <div class="reading-actions">
          <p class="rail-label">分享 / SHARE</p>
          <button type="button" data-copy-post-url><span class="tree-branch" aria-hidden="true">└</span><span>复制文章链接</span></button>
          <a href="#post-title"><span class="tree-branch" aria-hidden="true">└</span><span>回到标题 ↑</span></a>
          <span class="sr-only" data-copy-post-status role="status"></span>
        </div>
      </aside>`;
}

interface PostNeighbors {
  prev: Post | null;
  next: Post | null;
}

export function postPage(site: SiteConfig, post: Post, { prev, next }: PostNeighbors): string {
  const tags = (post.tags ?? []).map((tag) => `<a class="tag" href="${esc(tagUrl(tag))}">#${esc(tag)}</a>`).join('');
  const categories = post.categories.map((category) => `<span class="chip">${esc(category)}</span>`).join('');

  const navLink = (p: Post | null, label: string): string =>
    p
      ? `<a class="post-nav-link" href="${esc(p.url)}"><span class="post-nav-label">${label}</span><span class="post-nav-title">${esc(p.title)}</span></a>`
      : '<span class="post-nav-link is-empty"></span>';

  const content = `    <article class="post">
      <header class="post-header">
        <div class="post-categories">${categories || '<span class="chip">文章 / ARTICLE</span>'}</div>
        <h1 class="post-title" id="post-title" style="--article-transition:${articleTransition(post)}">${esc(post.title)}</h1>
        ${post.excerpt ? `<p class="post-intro">${esc(post.excerpt)}</p>` : ''}
        ${tags ? `<div class="post-tags">${tags}</div>` : ''}
        <dl class="post-byline">
          <div><dt>作者 / AUTHOR</dt><dd><span class="tree-branch" aria-hidden="true">└</span><a href="/about/" rel="author">${esc(site.author)}</a></dd></div>
          <div><dt>发布于 / PUBLISHED</dt><dd><span class="tree-branch" aria-hidden="true">└</span><time datetime="${esc(post.date.datetime)}" title="${esc(post.date.displayFull)}">${esc(post.date.display)}</time></dd></div>
          <div><dt>阅读时长 / READ TIME</dt><dd><span class="tree-branch" aria-hidden="true">└</span><span>约 ${post.minutes} 分钟 <span class="post-word-count">/ ${post.words} 字</span></span></dd></div>
        </dl>
      </header>

      <div class="post-layout">
        <span data-toc-anchor hidden></span>
${tocHtml(post)}
        <div class="post-content">
${post.html}
        </div>
      </div>

      <nav class="post-nav" aria-label="文章导航">
        <div class="post-nav-inner">
${navLink(prev, '← 上一篇')}
${navLink(next, '下一篇 →')}
        </div>
      </nav>
    </article>
    <script src="/assets/quote-share.js" defer></script>
    <button class="reading-mode-toggle" type="button" data-reading-mode-toggle aria-label="显示目录" aria-pressed="false">${icons.menu}</button>
    ${post.toc.length ? `<button class="toc-drawer-toggle" type="button" data-toc-drawer-open aria-label="打开目录" aria-haspopup="dialog" aria-controls="toc-drawer" aria-expanded="false">${icons.menu}</button>
    <dialog class="toc-drawer" id="toc-drawer" aria-labelledby="toc-drawer-heading">
      <div class="toc-drawer-header"><h2 id="toc-drawer-heading">文章目录</h2><button class="icon-button" type="button" data-toc-drawer-close aria-label="关闭目录">${icons.close}</button></div>
    </dialog>` : ''}`;

  return layout(site, {
    title: `${post.title} · ${site.title}`,
    description: post.description,
    path: post.url,
    active: null,
    bodyClass: 'page-post',
    content,
  });
}

/* ---------------------------------- 归档页 ---------------------------------- */

export function archivePage(site: SiteConfig, groups: ArchiveGroup[]): string {
  const total = groups.reduce((sum, group) => sum + group.posts.length, 0);
  const sections = groups.map((group) => `<section class="shelf-year" aria-labelledby="year-${esc(group.year)}">
    <div class="library-heading"><h2 id="year-${esc(group.year)}">${esc(group.year)}</h2><span>${group.posts.length} 篇文章</span></div>
    <div class="article-list">${group.posts.map(articleItem).join('\n')}</div>
  </section>`).join('\n');
  return layout(site, {
    title: `文章 · ${site.title}`, description: site.description,
    path: '/archives/', active: 'archives', bodyClass: 'page-archives',
    content: `<header class="page-header"><h1 class="page-title">文章</h1><p class="page-subtitle">共 ${total} 篇</p></header>${sections}`,
  });
}

/* ---------------------------------- 随笔 ---------------------------------- */

/** 置顶标记：首页纸片与随笔页共用。 */
const notePinHtml = (note: Note): string =>
  note.pinned ? `<span class="note-pin" title="置顶随笔">${icons.pin} 置顶</span>` : '';

function notePaper(note: Note): string {
  return `<article class="note-paper${note.pinned ? ' note-paper-pinned' : ''}">
    <a class="note-paper-link" href="${esc(note.url)}" aria-label="阅读 ${esc(note.date.display)} 的随笔">
      <div class="note-paper-meta">${notePinHtml(note)}<time datetime="${esc(note.date.datetime)}">${esc(note.date.iso)}</time></div>
      <p class="note-paper-text">${esc(note.excerpt)}</p>
      <span class="note-paper-read">读这条 ${icons.arrow}</span>
    </a>
  </article>`;
}

export function notesPage(site: SiteConfig, notes: Note[]): string {
  const list = notes.map((note) => `<article class="note-item${note.pinned ? ' note-item-pinned' : ''}" id="${esc(note.slug)}" aria-label="${esc(note.date.display)} 的随笔${note.pinned ? '（置顶）' : ''}">
    <div class="note-item-meta">${notePinHtml(note)}<a href="${esc(note.url)}"><time datetime="${esc(note.date.datetime)}">${esc(note.date.displayFull)}</time></a></div>
    <div class="post-content note-content">${note.html}</div>
  </article>`).join('\n');
  return layout(site, {
    title: `随笔 · ${site.title}`, description: `${site.author} 的随笔，记录零散的想法与日常。`,
    path: '/notes/', active: 'notes', bodyClass: 'page-notes',
    content: `<header class="page-header"><h1 class="page-title">随笔</h1><p class="page-subtitle">共 ${notes.length} 条</p></header>
    <div class="notes-list">${list || '<p class="notes-empty">还没有随笔。</p>'}</div>`,
  });
}

/* ---------------------------------- 标签页 ---------------------------------- */

// 标签字号：1 篇 14px，每多 1 篇 +3.5px，封顶 32px（CSS 云与词云共用同一尺寸，便于对比）。
// 用原始篇数线性递增而非 min/max 归一化：所有标签篇数接近时归一化会退化成两个字号。
const TAG_MIN_SIZE = 14;
const TAG_MAX_SIZE = 32;
const TAG_SIZE_STEP = 3.5;

export function tagCloudSize(count: number): number {
  return Math.min(TAG_MAX_SIZE, TAG_MIN_SIZE + (count - 1) * TAG_SIZE_STEP);
}

/** 标签索引页：服务端渲染的 CSS 标签云 + 可切换的 d3-cloud 词云（默认 CSS 云，无 JS 也可用）。 */
export function tagsIndexPage(site: SiteConfig, tags: TagGroup[]): string {
  const total = tags.reduce((sum, g) => sum + g.count, 0);
  const cloud = tags
    .map(
      (g) =>
        `        <a class="cloud-tag" href="${esc(tagUrl(g.tag))}" style="font-size:${tagCloudSize(g.count)}px">#${esc(g.tag)}<span class="cloud-count">${g.count}</span></a>`
    )
    .join('\n');

  // 词云数据内联进页面：tags.js 直接读预计算好的字号，免 fetch，也避免两处字号公式
  const payload = JSON.stringify(
    tags.map((g) => ({ tag: g.tag, count: g.count, size: tagCloudSize(g.count), url: tagUrl(g.tag) }))
  ).replaceAll('<', '\\u003c');

  const content = `    <header class="page-header">
      <p class="page-kicker">TOPIC MAP / EXPLORE</p>
      <h1 class="page-title">标签</h1>
      <p class="page-subtitle">共 ${tags.length} 个标签 · ${total} 篇文章</p>
    </header>

    <div class="tag-toolbar" hidden>
      <div class="tag-mode" role="tablist" aria-label="标签展示方式">
        <button type="button" class="tag-mode-btn is-active" data-tag-mode="cloud" role="tab" aria-selected="true">标签云</button>
        <button type="button" class="tag-mode-btn" data-tag-mode="word" role="tab" aria-selected="false">词云</button>
      </div>
    </div>

    <section class="tag-cloud" id="tag-cloud" aria-label="全部标签">
${cloud}
    </section>

    <div class="word-cloud" id="word-cloud" hidden>
      <canvas id="word-cloud-canvas">词云需要浏览器支持 Canvas，可切换回标签云模式。</canvas>
    </div>

    <script type="application/json" id="tag-cloud-data">${payload}</script>
    <script src="/assets/tags.js" defer></script>`;

  return layout(site, {
    title: `标签 · ${site.title}`,
    description: `按标签浏览全部 ${total} 篇文章`,
    path: '/tags/',
    active: 'tags',
    bodyClass: 'page-tags',
    content,
  });
}

/** 单标签页：该标签下的文章列表，复用文章卡片。 */
export function tagPage(site: SiteConfig, group: TagGroup): string {
  const cards = group.posts.map(postCard).join('\n');
  const content = `    <header class="page-header">
      <p class="page-kicker">TAG / ${esc(group.tag)}</p>
      <h1 class="page-title">#${esc(group.tag)}</h1>
      <p class="page-subtitle">共 ${group.count} 篇文章</p>
    </header>
    <div class="post-list tag-post-list">
${cards}
    </div>
    <a class="more-link tag-back" href="/tags/">← 全部标签</a>`;

  return layout(site, {
    title: `#${group.tag} · ${site.title}`,
    description: `${group.tag} 标签下的 ${group.count} 篇文章`,
    path: tagUrl(group.tag),
    active: 'tags',
    bodyClass: 'page-tag',
    content,
  });
}

/* ---------------------------------- 关于页 ---------------------------------- */

export function aboutPage(site: SiteConfig, about: AboutPage): string {
  const content = `    <section class="about">
      <div class="about-card">
        <div class="about-profile">
          <span class="about-avatar-frame">
            <img class="about-avatar" src="${esc(site.avatar)}" alt="${esc(site.author)} 的头像" width="116" height="116">
          </span>
          <div class="about-intro">
            <h1 class="about-title">${esc(about.title)}</h1>
            <p class="about-subtitle">${sloganHtml(site.subtitle)}</p>
          </div>
        </div>
      </div>
      <div class="post-content about-content">
${about.html}
      </div>
    </section>`;

  return layout(site, {
    title: `${about.title} · ${site.title}`,
    description: about.description || site.description,
    path: '/about/',
    active: 'about',
    bodyClass: 'page-about',
    content,
  });
}

/* ---------------------------------- 404 ---------------------------------- */

export function notFoundPage(site: SiteConfig): string {
  const content = `    <section class="not-found">
      <p class="not-found-code">404</p>
      <h1 class="not-found-title">页面走丢了</h1>
      <p class="not-found-text">这个地址不存在，或者文章已经搬家。</p>
      <a class="more-link" href="/">回到首页 ${icons.arrow}</a>
    </section>`;

  return layout(site, {
    title: `页面不存在 · ${site.title}`,
    description: site.description,
    path: '/404.html',
    active: null,
    bodyClass: 'page-404',
    content,
  });
}

/* ---------------------------------- RSS / Sitemap ---------------------------------- */

const cdata = (text: string): string =>
  `<![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

export function feedXml(site: SiteConfig, posts: Post[]): string {
  const items = posts
    .map(
      (post) => `    <item>
      <title>${esc(post.title)}</title>
      <link>${esc(site.url + post.url)}</link>
      <guid isPermaLink="true">${esc(site.url + post.url)}</guid>
      <pubDate>${esc(post.date.rfc822)}</pubDate>
      <description>${cdata(post.excerpt)}</description>
      <content:encoded>${cdata(post.html)}</content:encoded>
${(post.categories ?? []).map((c) => `      <category>${esc(c)}</category>`).join('\n')}
${(post.tags ?? []).map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${esc(site.url)}</link>
    <description>${esc(site.description)}</description>
    <language>${esc(site.lang)}</language>
    <lastBuildDate>${esc(posts[0]?.date.rfc822 ?? '')}</lastBuildDate>
    <atom:link href="${esc(site.url)}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export function sitemapXml(site: SiteConfig, entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${esc(site.url + entry.path)}</loc>
${entry.date ? `    <lastmod>${esc(entry.date.datetime)}</lastmod>\n` : ''}  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
