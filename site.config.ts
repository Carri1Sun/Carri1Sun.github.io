// 站点信息配置 —— 修改这里即可更新全站的标题、简介、导航和链接。

import type { SiteConfig } from './scripts/lib/types.ts';

const site = {
  // 站点标题（浏览器标签页、导航栏、RSS、SEO）
  title: "Subaru's Notes",
  // 作者名
  author: 'Subaru',
  // 首页副标题 / 个人签名
  subtitle: '寿司郎从从容容游刃有余集合',
  // 站点描述（SEO / RSS）
  description: 'Subaru 的个人博客，记录产品、工程与 Agent 实践。',
  // SEO 关键词
  keywords: ['Agent', '产品', 'Chromium', 'iOS', '独立开发'],
  // 站点语言与时区（用于日期显示与 RSS）
  lang: 'zh-CN',
  timezone: '+08:00',
  // 部署地址（GitHub Pages 自定义域 / 用户站点）
  url: 'https://carri1sun.github.io',
  // 社交链接
  github: 'https://github.com/Carri1Sun',
  // 头像路径
  avatar: '/assets/avatar.jpg',
  // 页脚
  footerSince: 2026,
  footerNote: 'Ideas in progress',
  // 导航菜单（按顺序展示）
  nav: [
    { label: '首页', href: '/', key: 'home' },
    { label: '归档', href: '/archives/', key: 'archives' },
    { label: '关于', href: '/about/', key: 'about' },
  ],
  // 首页最多展示的文章数，更多文章指向归档页
  postsPerPage: 10,
} satisfies SiteConfig;

export default site;
