// 全站 HTML / XML 模板。所有动态文本经 escapeHtml 转义后输出。

import { escapeHtml as esc, tagUrl } from './lib/utils.ts';
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

/* ---------------------------------- 内联 SVG 图标 ---------------------------------- */

const stroke = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  github:
    '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
  rss: stroke('<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>'),
  search: stroke('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  close: stroke('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  sun: stroke(
    '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
  ),
  moon: stroke('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
  arrow: stroke('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
};

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
      <a class="site-title" href="/" aria-label="${esc(site.title)}">
        <span class="site-title-mark" aria-hidden="true">K.</span>
        <span class="site-title-text">${esc(site.title)}</span>
      </a>
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

// 封面是站点自有的矢量图形，不依赖远程图片或 WebGL。
function bookCover(site: SiteConfig, post: Post, index: number): string {
  const number = String(index + 1).padStart(2, '0');
  const motifs: Record<string, string> = {
    'resource-optimize': 'frames', 'agent-evals-practice': 'orbit',
    'agent-plan-design': 'steps', 'how-to-use-ai': 'rays',
  };
  const motif = motifs[post.slug] ?? 'orbit';
  const art = motif === 'frames'
    ? '<rect x="25" y="25" width="190" height="120" rx="2"/><rect x="45" y="45" width="190" height="120" rx="2"/><rect x="65" y="65" width="190" height="120" rx="2"/><path d="M137 94l36 23-36 23z" fill="currentColor" stroke="none"/>'
    : motif === 'orbit'
    ? Array.from({length: 9}, (_, i) => `<ellipse cx="140" cy="110" rx="${28 + i * 10}" ry="80" transform="rotate(${i * 10} 140 110)"/>`).join('')
    : motif === 'steps'
    ? Array.from({length: 7}, (_, i) => `<path d="M${24+i*31} 185V${165-i*22}h31v${20+i*22}"/>`).join('')
    : Array.from({length: 24}, (_, i) => `<path d="M140 110L${140+105*Math.cos(i*Math.PI/12)} ${110+95*Math.sin(i*Math.PI/12)}"/>`).join('');
  return `<article class="book-entry">
    <a class="book-link" href="${esc(post.url)}" aria-label="阅读：${esc(post.title)}">
      <div class="book-stage">
        <div class="book book-${motif}">
          <div class="book-spine" aria-hidden="true">${esc(post.categories[0] ?? 'NOTES')} · ${number}</div>
          <div class="book-pages" aria-hidden="true"></div>
          <div class="book-front">
            <div class="book-top"><span>${esc(site.title.toUpperCase())}</span><span>${number}</span></div>
            <h3 class="book-title" style="--article-transition:${articleTransition(post)}">${esc(post.title)}</h3>
            <svg class="book-art" viewBox="0 0 280 220" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">${art}</svg>
            <div class="book-bottom"><span>${esc(post.categories[0] ?? '随笔')}</span><span>${esc(post.date.year)}</span></div>
          </div>
        </div>
      </div>
      <div class="book-caption"><time datetime="${esc(post.date.datetime)}">${esc(post.date.iso)}</time><span>${post.minutes} 分钟 ${icons.arrow}</span></div>
    </a>
    <p class="book-excerpt">${esc(post.excerpt)}</p>
  </article>`;
}

export function homePage(site: SiteConfig, posts: Post[], total: number, notes: Note[] = []): string {
  const content = `    <section class="press-intro">
      <h1 class="sr-only">${esc(site.title)}</h1>
      <button class="avatar-coin" type="button" data-avatar-flip aria-label="按住 ${esc(site.author)} 的头像旋转并放出像素烟花" aria-pressed="false" disabled>
        <span class="avatar-coin-inner" aria-hidden="true">
          <span class="avatar-coin-front"><img src="${esc(site.avatar)}" alt="" width="72" height="72"></span>
          <span class="avatar-coin-back"><img src="${esc(site.avatar)}" alt="" width="72" height="72"></span>
        </span>
        <span class="avatar-sparks" aria-hidden="true"></span>
      </button>
      <div class="press-description">
        <p>${sloganHtml(site.subtitle)}</p>
        <a class="press-about" href="/about/">关于我 ${icons.arrow}</a>
      </div>
    </section>
    <section class="press-library" aria-labelledby="library-title">
      <div class="library-heading"><h2 id="library-title">最近的文章</h2><div class="library-actions"><span>${String(total).padStart(2, '0')} 篇文章</span><a class="library-more" href="/archives/">查看更多文章 ${icons.arrow}</a></div></div>
      <div class="bookshelf">${posts.map((post, index) => bookCover(site, post, index)).join('\n')}</div>
    </section>
    <section class="home-notes" aria-labelledby="notes-title">
      <div class="library-heading"><h2 id="notes-title">最近的随笔</h2><div class="library-actions"><span>${String(notes.length).padStart(2, '0')} 条随笔</span><a class="library-more" href="/notes/">查看全部随笔 ${icons.arrow}</a></div></div>
      <div class="note-papers">${notes.slice(0, 3).map(notePaper).join('\n') || '<p class="notes-empty">还没有随笔。</p>'}</div>
    </section>`;
  return layout(site, {
    title: site.title, description: `${site.subtitle} ${site.description}`,
    path: '/', active: 'home', bodyClass: 'page-home', content,
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
  const tags = (post.tags ?? []).map((tag) => `<a class="tag" href="${esc(tagUrl(tag))}">#${esc(tag)}</a>`).join('');
  const category = post.categories.length
    ? `<span class="chip">${esc(post.categories[0] ?? '')}</span>`
    : '';

  const navLink = (p: Post | null, label: string): string =>
    p
      ? `<a class="post-nav-link" href="${esc(p.url)}"><span class="post-nav-label">${label}</span><span class="post-nav-title">${esc(p.title)}</span></a>`
      : '<span class="post-nav-link is-empty"></span>';

  const content = `    <article class="post">
      <header class="post-header">
        <p class="post-kicker">FIELD NOTE / ${esc(post.categories[0] ?? 'IDEA')}</p>
        <div class="post-meta">
          <time datetime="${esc(post.date.datetime)}">${esc(post.date.displayFull)}</time>
          <span class="meta-dot">·</span>
          <span>${post.words} 字 · 约 ${post.minutes} 分钟</span>
          ${category}
        </div>
        <h1 class="post-title" style="--article-transition:${articleTransition(post)}">${esc(post.title)}</h1>
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
  const total = groups.reduce((sum, group) => sum + group.posts.length, 0);
  let index = 0;
  const sections = groups.map((group) => `<section class="shelf-year" aria-labelledby="year-${esc(group.year)}">
    <div class="library-heading"><h2 id="year-${esc(group.year)}">${esc(group.year)}</h2><span>${group.posts.length} 篇文章</span></div>
    <div class="bookshelf">${group.posts.map((post) => bookCover(site, post, index++)).join('\n')}</div>
  </section>`).join('\n');
  return layout(site, {
    title: `文章 · ${site.title}`, description: site.description,
    path: '/archives/', active: 'archives', bodyClass: 'page-archives',
    content: `<header class="page-header"><h1 class="page-title">文章</h1><p class="page-subtitle">共 ${total} 篇</p></header>${sections}`,
  });
}

/* ---------------------------------- 随笔 ---------------------------------- */

function notePaper(note: Note): string {
  return `<article class="note-paper">
    <a class="note-paper-link" href="${esc(note.url)}" aria-label="阅读 ${esc(note.date.display)} 的随笔">
      <div class="note-paper-meta"><time datetime="${esc(note.date.datetime)}">${esc(note.date.iso)}</time></div>
      <p class="note-paper-text">${esc(note.excerpt)}</p>
      <span class="note-paper-read">读这条 ${icons.arrow}</span>
    </a>
  </article>`;
}

export function notesPage(site: SiteConfig, notes: Note[]): string {
  const list = notes.map((note) => `<article class="note-item" id="${esc(note.slug)}" aria-label="${esc(note.date.display)} 的随笔">
    <div class="note-item-meta"><a href="${esc(note.url)}"><time datetime="${esc(note.date.datetime)}">${esc(note.date.displayFull)}</time></a></div>
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
  const topics = site.keywords
    .map((keyword) => `<span class="hero-topic">${esc(keyword)}</span>`)
    .join('');
  const content = `    <section class="about">
      <div class="about-card">
        <p class="about-id">BUILDER ID / 001</p>
        <div class="about-profile">
          <span class="about-avatar-frame">
            <img class="about-avatar" src="${esc(site.avatar)}" alt="${esc(site.author)} 的头像" width="116" height="116">
          </span>
          <div class="about-intro">
            <h1 class="about-title">${esc(about.title)}</h1>
            <p class="about-subtitle">${sloganHtml(site.subtitle)}</p>
          </div>
        </div>
        <div class="about-card-footer">
          <div class="hero-topics" aria-label="关注领域">${topics}</div>
          <div class="hero-links about-links">
            <a class="hero-link" href="${esc(site.github)}" target="_blank" rel="noopener noreferrer">${icons.github} GitHub</a>
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
