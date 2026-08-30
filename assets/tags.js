// 标签索引页交互：标签云 / 词云两种模式切换，d3-cloud 按需加载与 canvas 绘制。
// 无依赖原生实现（词云布局用 assets/vendor/d3.layout.cloud.js，首次切换才加载）。

(() => {
  'use strict';

  const toolbar = document.querySelector('.tag-toolbar');
  const cloudSection = document.getElementById('tag-cloud');
  const wordSection = document.getElementById('word-cloud');
  const canvas = document.getElementById('word-cloud-canvas');
  const dataEl = document.getElementById('tag-cloud-data');
  if (!toolbar || !cloudSection || !wordSection || !canvas || !dataEl) return;

  const words = JSON.parse(dataEl.textContent || '[]');
  const MODE_KEY = 'tagMode';

  /* ---------------------------------- 模式切换 ---------------------------------- */

  const buttons = [...document.querySelectorAll('.tag-mode-btn')];

  function storedMode() {
    try {
      const mode = localStorage.getItem(MODE_KEY);
      return mode === 'cloud' || mode === 'word' ? mode : 'cloud';
    } catch {
      return 'cloud'; // 隐私模式下 localStorage 不可用
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* 同上 */
    }
    for (const button of buttons) {
      const active = button.dataset.tagMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    }
    cloudSection.hidden = mode !== 'cloud';
    wordSection.hidden = mode !== 'word';
    if (mode === 'word') {
      void showWordCloud();
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => setMode(button.dataset.tagMode));
  }

  toolbar.hidden = false; // 无 JS 时保持隐藏，纯 CSS 云直接可用

  /* ---------------------------------- d3-cloud 按需加载 ---------------------------------- */

  let libPromise = null;

  function loadCloudLib() {
    if (typeof window.d3?.layout?.cloud === 'function') return Promise.resolve();
    libPromise ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/d3.layout.cloud.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('词云脚本加载失败'));
      document.head.appendChild(script);
    });
    return libPromise;
  }

  /* ---------------------------------- 词云绘制 ---------------------------------- */

  let boxes = []; // 每个词的包围盒（词云坐标系，原点在画布中心），用于命中检测

  // 令牌色值是 16 进制（见 style.css 设计令牌），直接按通道混合
  function hexToRgb(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  function mixHex(from, to, ratio) {
    const a = hexToRgb(from);
    const b = hexToRgb(to);
    return a.map((v, i) => Math.round(v + (b[i] - v) * ratio));
  }

  function tokenColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // --font-sans 是逗号分隔的字族列表，含空格的段（Segoe UI）需要加引号 canvas 才认
  function canvasFontFamily() {
    return tokenColor('--font-sans')
      .split(',')
      .map((part) => {
        const name = part.trim().replace(/^['"]|['"]$/g, '');
        return name && (name.includes(' ') ? `'${name}'` : name);
      })
      .filter(Boolean)
      .join(', ');
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx || !words.length) return;

    // 尺寸跟随容器宽度，高度按比例限制在一个舒适区间
    const width = Math.round(Math.min(720, Math.max(320, wordSection.clientWidth || 680)));
    const height = Math.round(Math.min(420, Math.max(260, width * 0.45)));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const accent = tokenColor('--accent');
    const muted = tokenColor('--muted');
    const fontFamily = canvasFontFamily();
    const maxCount = Math.max(...words.map((w) => w.count));
    const ratio = (w) => (w.count - 1) / (maxCount - 1 || 1);

    // 种子随机：resize / 主题重绘时布局保持稳定，不闪烁
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    window.d3.layout
      .cloud()
      .size([width - 8, height - 8])
      .words(words.map((w) => ({ ...w })))
      .padding(4)
      // 中文标签旋转后几乎不可读，统一水平摆放，命中检测也因此是简单矩形
      .rotate(() => 0)
      .font(fontFamily)
      .fontWeight(600)
      .fontSize((w) => w.size)
      .random(seededRandom)
      .on('end', (placed) => {
        ctx.setTransform(dpr, 0, 0, dpr, (width * dpr) / 2, (height * dpr) / 2);
        ctx.clearRect(-width / 2, -height / 2, width, height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        boxes = [];
        for (const word of placed) {
          if (word.x == null || word.y == null) continue; // 没排下的词跳过
          const [r, g, b] = mixHex(muted, accent, ratio(word));
          ctx.font = `600 ${word.size}px ${fontFamily}`;
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillText(`#${word.tag}`, word.x, word.y);
          const half = ctx.measureText(`#${word.tag}`).width / 2;
          boxes.push({
            x0: word.x - half,
            y0: word.y - word.size / 2,
            x1: word.x + half,
            y1: word.y + word.size / 2,
            url: word.url,
          });
        }
      })
      .start();
  }

  /* ---------------------------------- 命中检测：悬停与点击 ---------------------------------- */

  function hitTest(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    return boxes.find((box) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) ?? null;
  }

  canvas.addEventListener('click', (event) => {
    const hit = hitTest(event);
    if (hit) window.location.href = hit.url;
  });

  canvas.addEventListener('mousemove', (event) => {
    canvas.style.cursor = hitTest(event) ? 'pointer' : 'default';
  });

  /* ---------------------------------- 重绘触发 ---------------------------------- */

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (wordSection.hidden) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 150);
  });

  // 明暗主题切换后按新令牌重绘
  new MutationObserver(() => {
    if (!wordSection.hidden) draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  async function showWordCloud() {
    try {
      await loadCloudLib();
      draw();
    } catch {
      if (!wordSection.querySelector('.word-cloud-error')) {
        const hint = document.createElement('p');
        hint.className = 'word-cloud-error';
        hint.textContent = '词云加载失败，已切回标签云。';
        wordSection.prepend(hint);
      }
      setMode('cloud');
    }
  }

  setMode(storedMode());
})();
