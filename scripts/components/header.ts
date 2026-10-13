// 全站共用 Header：统一品牌、导航、搜索和主题切换。

import { escapeHtml as esc } from '../lib/utils.ts';
import { icons } from '../lib/icons.ts';
import type { SiteConfig } from '../lib/types.ts';

/** 作者头像彩蛋：按住旋转并放出像素烟花，挂在标题栏品牌区。 */
const avatarCoinHtml = (site: SiteConfig): string =>
  `<button class="avatar-coin" type="button" data-avatar-flip aria-label="按住 ${esc(site.author)} 的头像旋转并放出像素烟花" aria-pressed="false" disabled>
    <span class="avatar-coin-inner" aria-hidden="true">
      <span class="avatar-coin-front"><img src="${esc(site.avatar)}" alt="" width="72" height="72"></span>
      <span class="avatar-coin-back"><img src="${esc(site.avatar)}" alt="" width="72" height="72"></span>
    </span>
    <span class="avatar-sparks" aria-hidden="true"></span>
  </button>`;

interface HeaderOptions {
  active: string | null;
  variant: 'home' | 'inner';
}

export function Header(site: SiteConfig, { active, variant }: HeaderOptions): string {
  const nav = site.nav
    .map((item) => {
      const isActive = item.key === active;
      return `<a class="nav-link${isActive ? ' active' : ''}" href="${esc(item.href)}"${isActive ? ' aria-current="page"' : ''}>${esc(item.label)}</a>`;
    })
    .join('\n');

  return `<header class="site-header site-header--${variant}" data-header-mode="fixed">
    <div class="header-inner">
      <div class="header-brand">
        ${avatarCoinHtml(site)}
        <a class="site-title" href="/" aria-label="${esc(site.title)}">
          <span class="site-title-text">${esc(site.title)}</span>
        </a>
      </div>
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
  <div class="site-header-spacer" aria-hidden="true"></div>`;
}
