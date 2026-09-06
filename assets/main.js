// 前端交互：明暗主题、阅读进度条、目录高亮、代码复制、Ctrl/Cmd+K 站内搜索。
// 全部为无依赖的原生实现。

(() => {
  'use strict';

  /* ---------------------------------- 明暗主题 ---------------------------------- */

  const THEME_KEY = 'theme';
  const root = document.documentElement;

  function setTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* 隐私模式下 localStorage 不可用，忽略 */
    }
  }

  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
      button.classList.remove('is-switching');
      requestAnimationFrame(() => button.classList.add('is-switching'));
      setTimeout(() => button.classList.remove('is-switching'), 420);
    });
  }

  // 系统主题变化时跟随，除非用户手动选过
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => {
      let stored = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {
        /* 同上 */
      }
      if (stored !== 'light' && stored !== 'dark') setTheme(event.matches ? 'dark' : 'light');
    });

  /* ---------------------------------- 阅读进度条 ---------------------------------- */

  const progressBar = document.querySelector('.progress-bar');
  if (progressBar && document.body.classList.contains('page-post')) {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progressBar.style.width = `${Math.min(100, ratio * 100)}%`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------------------------- 目录高亮 ---------------------------------- */

  const tocLinks = [...document.querySelectorAll('.toc-link')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const idToLink = new Map(
      tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link])
    );
    const headings = [...idToLink.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    let activeId = headings[0]?.id;
    const setActive = () => {
      for (const [id, link] of idToLink) {
        link.classList.toggle('active', id === activeId);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) activeId = entry.target.id;
        }
        setActive();
      },
      // 顶部偏移避开吸顶导航：视口上沿 1/3 处的标题视为“当前”标题
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((heading) => observer.observe(heading));
    setActive();

    document.querySelector('.toc')?.addEventListener('click', (event) => {
      const link = event.target.closest('.toc-link');
      if (!link) return;
      activeId = decodeURIComponent(link.hash.slice(1));
      setActive();
    });
  }

  /* ---------------------------------- 代码复制 ---------------------------------- */

  for (const pre of document.querySelectorAll('.post-content pre')) {
    const button = document.createElement('button');
    button.className = 'code-copy';
    button.type = 'button';
    button.textContent = '复制';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.innerText ?? '');
        button.textContent = '已复制';
      } catch {
        button.textContent = '复制失败';
      }
      setTimeout(() => {
        button.textContent = '复制';
      }, 1600);
    });
    pre.appendChild(button);
  }

  /* ---------------------------------- 站内搜索 ---------------------------------- */

  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const resultList = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  const closeButton = overlay?.querySelector('.search-close');

  if (overlay && input && resultList && status && closeButton instanceof HTMLElement) {
    let index = null;
    let indexPromise = null;
    let loadError = false;
    let results = [];
    let selected = 0;
    let lastFocused = null;
    let openRevision = 0;
    const backgroundElements = [...document.body.children].filter((element) => element !== overlay);

    const escapeHtml = (text) =>
      text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

    async function loadIndex() {
      if (index !== null) return index;
      if (!indexPromise) {
        loadError = false;
        indexPromise = fetch('/search.json')
          .then((response) => {
            if (!response.ok) throw new Error(`搜索索引加载失败：${response.status}`);
            return response.json();
          })
          .then((data) => {
            index = data;
            return data;
          })
          .catch((error) => {
            loadError = true;
            throw error;
          })
          .finally(() => {
            indexPromise = null;
          });
      }
      return indexPromise;
    }

    function snippet(text, query) {
      const at = text.toLowerCase().indexOf(query.toLowerCase());
      if (at < 0) return escapeHtml(text.slice(0, 80));
      const start = Math.max(0, at - 32);
      return `…${escapeHtml(text.slice(start, at))}<mark>${escapeHtml(
        text.slice(at, at + query.length)
      )}</mark>${escapeHtml(text.slice(at + query.length, at + query.length + 48))}…`;
    }

    function search(posts, query) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const terms = q.split(/\s+/);
      return posts
        .map((post) => {
          const title = post.title.toLowerCase();
          const tags = (post.tags || []).join(' ').toLowerCase();
          const excerpt = (post.excerpt || '').toLowerCase();
          const content = (post.content || '').toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (!title.includes(term) && !tags.includes(term) && !excerpt.includes(term) && !content.includes(term)) {
              return null;
            }
            if (title.includes(term)) score += 10;
            if (tags.includes(term) || post.category.toLowerCase().includes(term)) score += 5;
            if (excerpt.includes(term)) score += 3;
            if (content.includes(term)) score += 1;
          }
          return { post, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((entry) => entry.post);
    }

    function render(statusMessage = '') {
      if (!results.length) {
        resultList.innerHTML = '';
        input.removeAttribute('aria-activedescendant');
        status.hidden = false;
        status.textContent = statusMessage || (
          input.value.trim() ? '没有找到相关文章' : '输入关键词，搜索全站文章'
        );
        return;
      }
      status.hidden = true;
      resultList.innerHTML = results
        .map((post, i) => {
          const highlighted = input.value.trim()
            ? escapeHtml(post.title).replace(
                new RegExp(
                  `(${input.value.trim().split(/\s+/).map(escapeRegExp).join('|')})`,
                  'gi'
                ),
                '<mark>$1</mark>'
              )
            : escapeHtml(post.title);
          const meta = [post.date, post.category, ...(post.tags || [])].filter(Boolean).join(' · ');
          return `<li id="search-result-${i}" class="search-result${i === selected ? ' selected' : ''}" data-url="${post.url}" role="option" aria-selected="${i === selected}">
            <div class="search-result-title">${highlighted}</div>
            <div class="search-result-meta">${escapeHtml(meta)}</div>
          </li>`;
        })
        .join('');
      input.setAttribute('aria-activedescendant', `search-result-${selected}`);
    }

    function escapeRegExp(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function updateResults() {
      if (index === null) {
        results = [];
        render(loadError ? '搜索暂时不可用，请稍后重试' : '搜索索引正在加载…');
        return;
      }
      results = search(index, input.value);
      selected = 0;
      render();
    }

    function setBackgroundInert(inert) {
      for (const element of backgroundElements) element.inert = inert;
    }

    function open() {
      const revision = ++openRevision;
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      setBackgroundInert(true);
      input.setAttribute('aria-expanded', 'true');
      input.value = '';
      results = [];
      selected = 0;
      render(index === null ? '搜索索引正在加载…' : '');
      input.focus();
      void loadIndex()
        .then(() => {
          if (revision === openRevision && !overlay.hidden) updateResults();
        })
        .catch(() => {
          if (revision === openRevision && !overlay.hidden) updateResults();
        });
    }

    function close() {
      if (overlay.hidden) return;
      openRevision += 1;
      overlay.hidden = true;
      document.body.style.overflow = '';
      setBackgroundInert(false);
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      lastFocused?.focus();
      lastFocused = null;
    }

    function move(step) {
      if (!results.length) return;
      selected = (selected + step + results.length) % results.length;
      render();
      resultList
        .querySelector('.selected')
        ?.scrollIntoView({ block: 'nearest' });
    }

    function go(url) {
      close();
      window.location.href = url;
    }

    for (const button of document.querySelectorAll('[data-search-open]')) {
      button.addEventListener('click', open);
    }
    overlay.addEventListener('click', (event) => {
      if (event.target.closest('[data-search-close]')) close();
    });

    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === input) {
          event.preventDefault();
          closeButton.focus();
        } else if (!event.shiftKey && document.activeElement === closeButton) {
          event.preventDefault();
          input.focus();
        }
      }
    });

    input.addEventListener('input', () => {
      updateResults();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        move(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (results[selected]) go(results[selected].url);
      }
    });

    resultList.addEventListener('click', (event) => {
      const item = event.target.closest('.search-result');
      if (item) go(item.dataset.url);
    });

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        overlay.hidden ? open() : close();
      } else if (event.key === 'Escape' && !overlay.hidden) {
        close();
      }
    });
  }
})();
