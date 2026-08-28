// 全站 HTML / XML 模板。所有动态文本经 escapeHtml 转义后输出。

import { escapeHtml as esc } from './lib/utils.ts';
import type {
  AboutPage,
  ArchiveGroup,
  Post,
  SiteConfig,
  SitemapEntry,
  TocEntry,
} from './lib/types.ts';

/* ---------------------------------- 内联 SVG 图标 ---------------------------------- */

const stroke = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  github:
    '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
  rss: stroke('<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>'),
  search: stroke('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  sun: stroke(
    '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
  ),
  moon: stroke('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
  arrow: stroke('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
};

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
  const nav = site.nav
    .map((item) => {
      const isActive = item.key === page.active;
      return `<a class="nav-link${isActive ? ' active' : ''}" href="${esc(item.href)}"${isActive ? ' aria-current="page"' : ''}>${esc(item.label)}</a>`;
    })
    .join('\n');

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
  <link rel="stylesheet" href="/assets/style.css">
  ${themeBoot}
  <script src="/assets/main.js" defer></script>
</head>
<body class="${esc(page.bodyClass)}">
  <a class="skip-link" href="#main">跳到正文</a>
  <div class="progress-bar" aria-hidden="true"></div>

  <header class="site-header">
    <div class="container header-inner">
      <a class="site-title" href="/">${esc(site.title)}</a>
      <nav class="site-nav" aria-label="主导航">
        ${nav}
        <button class="icon-button" type="button" data-search-open aria-label="搜索（Ctrl+K）" title="搜索 Ctrl+K">${icons.search}</button>
        <button class="icon-button" type="button" data-theme-toggle aria-label="切换明暗主题" title="切换主题">
          <span class="theme-icon theme-icon-sun">${icons.sun}</span>
          <span class="theme-icon theme-icon-moon">${icons.moon}</span>
        </button>
      </nav>
    </div>
  </header>

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
    <div class="search-panel" role="dialog" aria-modal="true" aria-label="站内搜索">
      <div class="search-input-row">
        <span class="search-input-icon">${icons.search}</span>
        <input id="search-input" type="search" placeholder="搜索文章…" autocomplete="off" spellcheck="false">
        <kbd>esc</kbd>
      </div>
      <ul class="search-results" id="search-results" role="listbox" aria-label="搜索结果"></ul>
      <div class="search-hint"><span>↑↓ 选择</span><span>↵ 打开</span></div>
    </div>
  </div>
</body>
</html>
`;
}

/* ---------------------------------- 首页 ---------------------------------- */

function postCard(post: Post): string {
  const tags = (post.tags ?? []).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('');
  const category = post.categories.length
    ? `<span class="chip">${esc(post.categories[0] ?? '')}</span>`
    : '';

  return `        <article class="post-card">
          <a class="post-card-link" href="${esc(post.url)}">
            <header class="post-card-meta">
              <time datetime="${esc(post.date.datetime)}">${esc(post.date.iso)}</time>
              <span class="meta-dot">·</span>
              <span>约 ${post.minutes} 分钟</span>
              ${category}
            </header>
            <h2 class="post-card-title">${esc(post.title)}</h2>
            <p class="post-card-excerpt">${esc(post.excerpt)}</p>
            ${tags ? `<footer class="post-card-tags">${tags}</footer>` : ''}
          </a>
        </article>`;
}

export function homePage(site: SiteConfig, posts: Post[], total: number): string {
  const cards = posts.map(postCard).join('\n');
  const truncated = total > posts.length;
  const content = `    <section class="hero">
      <img class="hero-avatar" src="${esc(site.avatar)}" alt="${esc(site.author)} 的头像" width="72" height="72">
      <div class="hero-text">
        <h1 class="hero-name">${esc(site.author)}</h1>
        <p class="hero-subtitle">${esc(site.subtitle)}</p>
        <div class="hero-links">
          <a class="hero-link" href="${esc(site.github)}" target="_blank" rel="noopener noreferrer">${icons.github} GitHub</a>
          <a class="hero-link" href="/feed.xml">${icons.rss} RSS</a>
        </div>
      </div>
    </section>

    <section class="post-section">
      <div class="section-heading-row">
        <h2 class="section-heading">文章</h2>
        <span class="section-count">${total} 篇</span>
      </div>
      <div class="post-list">
${cards}
      </div>
      ${truncated ? `      <a class="more-link" href="/archives/">查看全部 ${total} 篇 ${icons.arrow}</a>` : ''}
    </section>`;

  return layout(site, {
    title: site.title,
    description: `${site.subtitle} ${site.description}`,
    path: '/',
    active: 'home',
    bodyClass: 'page-home',
    content,
  });
}

/* ---------------------------------- 文章页 ---------------------------------- */

function tocHtml(toc: TocEntry[]): string {
  if (!toc.length) return '';
  const items = toc
    .map(
      (h) =>
        `<a class="toc-link toc-lv${h.depth}" href="#${esc(h.id)}">${esc(h.text)}</a>`
    )
    .join('\n');
  return `      <aside class="toc" aria-label="目录">
        <nav class="toc-nav">${items}</nav>
      </aside>`;
}

interface PostNeighbors {
  prev: Post | null;
  next: Post | null;
}

export function postPage(site: SiteConfig, post: Post, { prev, next }: PostNeighbors): string {
  const tags = (post.tags ?? []).map((tag) => `<a class="tag" href="/archives/">#${esc(tag)}</a>`).join('');
  const category = post.categories.length
    ? `<span class="chip">${esc(post.categories[0] ?? '')}</span>`
    : '';

  const navLink = (p: Post | null, label: string): string =>
    p
      ? `<a class="post-nav-link" href="${esc(p.url)}"><span class="post-nav-label">${label}</span><span class="post-nav-title">${esc(p.title)}</span></a>`
      : '<span class="post-nav-link is-empty"></span>';

  const content = `    <article class="post">
      <header class="post-header">
        <div class="post-meta">
          <time datetime="${esc(post.date.datetime)}">${esc(post.date.displayFull)}</time>
          <span class="meta-dot">·</span>
          <span>${post.words} 字 · 约 ${post.minutes} 分钟</span>
          ${category}
        </div>
        <h1 class="post-title">${esc(post.title)}</h1>
        ${tags ? `<div class="post-tags">${tags}</div>` : ''}
      </header>

      <div class="post-layout">
        <div class="post-content">
${post.html}
        </div>
${tocHtml(post.toc)}
      </div>

      <nav class="post-nav" aria-label="文章导航">
${navLink(prev, '← 上一篇')}
${navLink(next, '下一篇 →')}
      </nav>
    </article>`;

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
  const total = groups.reduce((sum, g) => sum + g.posts.length, 0);
  const sections = groups
    .map(
      (group) => `      <section class="archive-group">
        <h2 class="archive-year">${group.year}<span class="archive-count">${group.posts.length}</span></h2>
        <ul class="archive-list">
${group.posts
  .map(
    (post) => `          <li class="archive-item">
            <time datetime="${esc(post.date.datetime)}">${esc(post.date.short)}</time>
            <a class="archive-link" href="${esc(post.url)}">${esc(post.title)}</a>
            ${
              post.categories.length
                ? `<span class="chip">${esc(post.categories[0] ?? '')}</span>`
                : ''
            }
          </li>`
  )
  .join('\n')}
        </ul>
      </section>`
    )
    .join('\n');

  const content = `    <header class="page-header">
      <h1 class="page-title">归档</h1>
      <p class="page-subtitle">共 ${total} 篇文章</p>
    </header>
    <div class="archive">
${sections}
    </div>`;

  return layout(site, {
    title: `归档 · ${site.title}`,
    description: site.description,
    path: '/archives/',
    active: 'archives',
    bodyClass: 'page-archives',
    content,
  });
}

/* ---------------------------------- 关于页 ---------------------------------- */

export function aboutPage(site: SiteConfig, about: AboutPage): string {
  const content = `    <section class="about">
      <div class="about-card">
        <img class="about-avatar" src="${esc(site.avatar)}" alt="${esc(site.author)} 的头像" width="88" height="88">
        <h1 class="about-title">${esc(about.title)}</h1>
        <p class="about-subtitle">${esc(site.subtitle)}</p>
        <div class="hero-links about-links">
          <a class="hero-link" href="${esc(site.github)}" target="_blank" rel="noopener noreferrer">${icons.github} GitHub</a>
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
