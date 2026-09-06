// 前端交互：明暗主题、阅读进度条、目录高亮、代码复制、Ctrl/Cmd+K 站内搜索。
// 全部为无依赖的原生实现。

(() => {
  'use strict';

  /* 只在打开文章时匹配所点击的标题，列表之间切换不移动书名。 */
  const clearArticleTransition = () => {
    for (const title of document.querySelectorAll('.book-title, .post-card-title')) {
      title.style.removeProperty('view-transition-name');
    }
  };
  window.addEventListener('pageshow', clearArticleTransition);
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    clearArticleTransition();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const link = event.target.closest('.book-link, .post-card-link');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const title = link.querySelector('.book-title, .post-card-title');
    const name = title?.style.getPropertyValue('--article-transition');
    if (name) title.style.setProperty('view-transition-name', name);
  });

  /* ---------------------------------- 作者头像彩蛋 ---------------------------------- */

  const avatarCoin = document.querySelector('[data-avatar-flip]');
  if (avatarCoin) {
    const inner = avatarCoin.querySelector('.avatar-coin-inner');
    const sparks = avatarCoin.querySelector('.avatar-sparks');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles = new Set();
    let holding = false;
    let frame = 0;
    let angle = 0;
    let previousTime = 0;
    let lastBurst = 0;
    let lastInput = -Infinity;
    let settleTimer;
    let activePointer = null;

    function burst() {
      if (reducedMotion.matches || particles.size >= 60) return;
      const colors = ['#ff0000', '#ff5546', '#ffbd69', '#fff1ce'];
      for (let i = 0; i < 8 && particles.size < 60; i += 1) {
        const pixel = document.createElement('span');
        pixel.className = 'avatar-pixel';
        const direction = Math.random() * Math.PI * 2;
        const radius = avatarCoin.clientWidth / 2;
        const distance = 35 + Math.random() * 55;
        const x = Math.cos(direction);
        const y = Math.sin(direction);
        pixel.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        pixel.style.width = pixel.style.height = `${Math.random() > .7 ? 5 : 3}px`;
        sparks.appendChild(pixel);
        const animation = pixel.animate([
          { transform: `translate(${Math.round(x * radius)}px, ${Math.round(y * radius)}px)`, opacity: 1 },
          { transform: `translate(${Math.round(x * (radius + distance))}px, ${Math.round(y * (radius + distance) + 12)}px)`, opacity: .9, offset: .65 },
          { transform: `translate(${Math.round(x * (radius + distance * 1.15))}px, ${Math.round(y * (radius + distance * 1.15) + 36)}px)`, opacity: 0 },
        ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.15,.6,.35,1)' });
        const particle = { pixel, animation };
        particles.add(particle);
        animation.finished.catch(() => {}).finally(() => {
          pixel.remove();
          particles.delete(particle);
        });
      }
    }

    function tick(time) {
      if (!holding) return;
      angle += Math.min(time - previousTime, 50) * 1.2;
      previousTime = time;
      inner.style.transform = `rotateY(${angle}deg)`;
      if (time - lastBurst >= 140) {
        burst();
        lastBurst = time;
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (holding) return;
      clearTimeout(settleTimer);
      holding = true;
      avatarCoin.classList.add('is-spinning');
      avatarCoin.setAttribute('aria-pressed', 'true');
      previousTime = performance.now();
      lastBurst = previousTime;
      if (!reducedMotion.matches) {
        burst();
        frame = requestAnimationFrame(tick);
      }
    }

    function stop() {
      if (!holding) return;
      holding = false;
      cancelAnimationFrame(frame);
      avatarCoin.classList.remove('is-spinning');
      avatarCoin.setAttribute('aria-pressed', 'false');
      // 沿当前方向收尾到完整头像，避免松手时停在侧面或突然倒转。
      angle = Math.ceil(angle / 180) * 180;
      inner.style.transform = `rotateY(${angle}deg)`;
    }

    function cleanup() {
      stop();
      activePointer = null;
      clearTimeout(settleTimer);
      for (const { pixel, animation } of particles) {
        animation.cancel();
        pixel.remove();
      }
      particles.clear();
    }

    avatarCoin.disabled = false;
    avatarCoin.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || activePointer !== null) return;
      event.preventDefault();
      lastInput = performance.now();
      activePointer = event.pointerId;
      avatarCoin.focus({ preventScroll: true });
      avatarCoin.setPointerCapture(event.pointerId);
      start();
    });
    const releasePointer = (event) => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      stop();
    };
    avatarCoin.addEventListener('pointerup', releasePointer);
    avatarCoin.addEventListener('pointercancel', releasePointer);
    avatarCoin.addEventListener('lostpointercapture', releasePointer);
    avatarCoin.addEventListener('contextmenu', (event) => event.preventDefault());
    avatarCoin.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      lastInput = performance.now();
      start();
    });
    avatarCoin.addEventListener('keyup', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      lastInput = performance.now();
      stop();
    });
    // 兼容辅助技术直接触发 click，同时避免重复处理指针和键盘的 click。
    avatarCoin.addEventListener('click', (event) => {
      if (event.detail !== 0 || performance.now() - lastInput < 500) return;
      start();
      settleTimer = setTimeout(stop, 300);
    });
    avatarCoin.addEventListener('blur', cleanup);
    window.addEventListener('blur', cleanup);
    window.addEventListener('pagehide', cleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cleanup();
    });
    reducedMotion.addEventListener('change', cleanup);
  }

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
