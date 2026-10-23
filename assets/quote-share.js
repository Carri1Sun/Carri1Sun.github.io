// 文章摘录：原生选区 + 本地 Canvas PNG，无网络请求和持久化评论。
(() => {
  'use strict';
  const article = document.querySelector('.page-post .post-content');
  if (!article) return;
  const mobile = window.matchMedia('(any-pointer: coarse)');
  const title = document.querySelector('#post-title').textContent;
  const source = document.querySelector('link[rel="canonical"]').href;
  const linkText = source.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const siteName = document.querySelector('meta[property="og:site_name"]').content;

  // 卡片版式（CSS 像素，画布宽 720，按 2 倍导出）。
  const WIDTH = 720;
  const PAD = 76;
  const TEXT_W = 568;
  const COMMENT_TEXT_W = 512;
  const COMMENT_SIZE = 30;
  const COMMENT_LEADING = 46;
  const FOOT_TEXT_W = 404;
  const URL_SIZE = 20;
  const URL_LEADING = 30;
  const QR_BOX = 140;
  const QR_SIZE = 110;
  const QUOTE_TOP = 176;
  const MIN_HEIGHT = 960; // 最小 3:4，内容更多时自动加高。

  // 宋体优先使用系统自带字体（macOS / iOS 的 Songti SC、Windows 的 SimSun 等），
  // 没有时才加载子集化的 Noto Serif SC。
  const systemSerifCandidates = ['"Songti SC"', 'STSong', 'SimSun', '"Noto Serif CJK SC"'];
  const detectSystemSerif = () => {
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return '';
    const sample = '摘录Aa0';
    probe.font = '40px monospace';
    const fallback = probe.measureText(sample).width;
    return systemSerifCandidates.find((name) => {
      probe.font = `40px ${name}, monospace`;
      return probe.measureText(sample).width !== fallback;
    }) || '';
  };
  const systemSerif = detectSystemSerif();
  const serif = systemSerif ? `${systemSerif}, serif` : '"Quote Serif", "Noto Serif CJK SC", serif';

  const toolbar = document.createElement('div');
  toolbar.className = 'quote-toolbar';
  toolbar.hidden = true;
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '选中文字操作');
  toolbar.innerHTML = '<button type="button" data-quote-copy>复制</button><button type="button" data-quote-share>生成卡片</button>';
  const notice = document.createElement('p');
  notice.className = 'quote-notice';
  notice.setAttribute('role', 'status');
  const dialog = document.createElement('dialog');
  dialog.className = 'quote-dialog';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-labelledby', 'quote-heading');
  dialog.innerHTML = `<header class="quote-dialog-header"><h2 id="quote-heading">分享卡片</h2><button type="button" class="quote-close" aria-label="关闭分享">×</button></header>
    <div class="quote-editor"><div class="quote-preview"><img alt="分享卡片预览，包含选中的原文、评论和文章来源" hidden><p class="quote-render-status" role="status">正在生成卡片…</p></div>
    <div class="quote-controls"><label for="quote-comment">写下你的想法 <span>可选</span></label><textarea id="quote-comment" maxlength="200" rows="4" placeholder="这一段，让我想到……" aria-describedby="quote-privacy"></textarea><p id="quote-privacy" class="quote-help">最多 200 字</p><div class="quote-buttons"><button type="button" data-quote-save disabled>下载图片</button><button type="button" data-quote-native hidden disabled>分享 / 保存图片</button></div><p class="quote-help quote-save-hint" hidden>可长按预览图片保存；支持的浏览器也可打开系统分享面板。</p><p class="quote-export-status" role="status" aria-live="polite"></p></div></div>`;
  document.body.append(toolbar, notice, dialog);
  const image = dialog.querySelector('img');
  const comment = dialog.querySelector('textarea');
  const save = dialog.querySelector('[data-quote-save]');
  const native = dialog.querySelector('[data-quote-native]');
  const status = dialog.querySelector('.quote-export-status');
  const renderStatus = dialog.querySelector('.quote-render-status');
  let selected = '';
  let quote = '';
  let imageUrl = '';
  let file = null;
  let revision = 0;
  let timer;
  let noticeTimer;
  let priorFocus;
  let toolbarActive = false;
  let interactionTimer;

  function inform(text) {
    notice.textContent = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.textContent = ''; }, 3500);
  }
  function selection() {
    const value = window.getSelection();
    if (!value || value.isCollapsed || !value.rangeCount) return null;
    const range = value.getRangeAt(0);
    if (!article.contains(range.startContainer) || !article.contains(range.endContainer)) return null;
    const text = value.toString().trim();
    return text ? { text, range } : null;
  }
  function positionMobileToolbar() {
    const viewport = window.visualViewport;
    if (!mobile.matches || !viewport) return;
    toolbar.style.setProperty('--quote-viewport-top', `${Math.max(8, viewport.offsetTop + Math.min(viewport.height, document.documentElement.clientHeight) - toolbar.offsetHeight - 22)}px`);
    toolbar.style.setProperty('--quote-viewport-center', `${viewport.offsetLeft + Math.min(viewport.width, document.documentElement.clientWidth) / 2}px`);
  }
  window.visualViewport?.addEventListener('resize', positionMobileToolbar);
  window.visualViewport?.addEventListener('scroll', positionMobileToolbar);
  function updateSelection(point) {
    if (dialog.open || toolbarActive) return;
    const current = selection();
    if (!current) { toolbar.hidden = true; selected = ''; return; }
    selected = current.text;
    toolbar.hidden = false;
    if (mobile.matches) { positionMobileToolbar(); return; } // 避开原生菜单和选区手柄。
    const rect = current.range.getBoundingClientRect();
    const x = point?.x ?? rect.left + rect.width / 2;
    const y = point?.y ?? (rect.top - toolbar.offsetHeight - 10);
    toolbar.style.left = `${Math.max(8, Math.min(innerWidth - toolbar.offsetWidth - 8, x - toolbar.offsetWidth / 2))}px`;
    toolbar.style.top = `${Math.max(8, Math.min(innerHeight - toolbar.offsetHeight - 8, y))}px`;
  }
  document.addEventListener('selectionchange', () => {
    clearTimeout(timer);
    timer = setTimeout(updateSelection, 180);
  });
  document.addEventListener('pointerup', () => { clearTimeout(timer); timer = setTimeout(updateSelection, 30); });
  toolbar.addEventListener('pointerdown', (event) => {
    toolbarActive = true;
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => { toolbarActive = false; }, 1000);
    event.preventDefault();
  });
  toolbar.addEventListener('click', () => { toolbarActive = false; });
  article.addEventListener('contextmenu', (event) => {
    if (mobile.matches || event.shiftKey || event.target.closest('a, img, pre, input, textarea')) return;
    if (selection()) { event.preventDefault(); updateSelection({ x: event.clientX, y: event.clientY }); }
  });
  window.addEventListener('scroll', () => { if (!mobile.matches) toolbar.hidden = true; }, { passive: true });
  window.addEventListener('resize', () => { toolbar.hidden = true; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toolbar.hidden = true; });
  toolbar.querySelector('[data-quote-copy]').addEventListener('click', async () => {
    const text = selected;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;left:-9999px';
        document.body.append(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('copy');
      }
      inform('已复制选中的文字');
    } catch { inform('复制失败，请使用系统的复制菜单'); }
  });

  // 按字素换行，保留换行和 emoji；长 URL 同样可以折行。
  function lines(ctx, text, width) {
    const result = [];
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
    for (const paragraph of text.split('\n')) {
      let line = '';
      const chars = segmenter ? Array.from(segmenter.segment(paragraph), (item) => item.segment) : Array.from(paragraph);
      for (const char of chars) {
        if (line && ctx.measureText(line + char).width > width) {
          // 闭合标点允许轻微悬挂，避免逗号、句号单独出现在行首。
          if (/^[，。！？、；：）》」』】〕〉…,.!?;:%）]$/u.test(char) && ctx.measureText(line).width <= width) {
            line += char;
            continue;
          }
          // 尽量保留完整英文单词，并把行尾的开括号移到下一行。
          const word = /^[A-Za-z0-9]$/.test(char) ? line.match(/[A-Za-z0-9]+$/)?.[0] : '';
          const opening = line.match(/[（(《「『【〔〈“‘]$/u)?.[0];
          const carry = opening || (word && word.length < line.length && ctx.measureText(word + char).width <= width ? word : '');
          result.push(carry ? line.slice(0, -carry.length) : line);
          line = carry || '';
        }
        line += char;
      }
      result.push(line);
    }
    return result;
  }

  // 头像只加载一次；失败时卡片照常生成，只是没有头像。
  let avatarPromise;
  function loadAvatar() {
    avatarPromise ??= (() => {
      const src = document.querySelector('.avatar-coin-front img')?.getAttribute('src');
      if (!src) return Promise.resolve(null);
      const img = new Image();
      img.src = src;
      return img.decode().then(() => img, () => null);
    })();
    return avatarPromise;
  }

  // 二维码库按需加载（与词云相同的做法），纯前端生成，不发送文章地址。
  let qrPromise;
  function loadQr() {
    if (window.QrCreator) return Promise.resolve(true);
    qrPromise ??= new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qr-creator.min.js';
      script.onload = () => resolve(!!window.QrCreator);
      script.onerror = () => { qrPromise = null; resolve(false); };
      document.head.append(script);
    });
    return qrPromise;
  }
  function qrCanvas(text, size) {
    const qr = document.createElement('canvas');
    qr.width = qr.height = size;
    QrCreator.render({ text, radius: 0, ecLevel: 'M', fill: '#000000', background: '#ffffff', size }, qr);
    return qr;
  }

  async function render() {
    const version = ++revision;
    file = null;
    save.disabled = native.disabled = true;
    renderStatus.hidden = false;
    renderStatus.textContent = '正在生成卡片…';
    status.textContent = '';
    try {
      // 只有系统没有宋体时才下载子集字体；Canvas 不会触发 CSS 字体下载，需要显式加载。
      let serifLoaded = true;
      if (!systemSerif) {
        try { await document.fonts.load('400 36px "Quote Serif"', quote); }
        catch { serifLoaded = false; }
      }
      await document.fonts.ready;
      const [avatar, hasQr] = await Promise.all([loadAvatar(), loadQr()]);
      if (version !== revision || !dialog.open) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      const css = getComputedStyle(document.documentElement);
      const color = (name) => css.getPropertyValue(name).trim();
      const sans = css.getPropertyValue('--font-sans');
      const setSans = (size, weight = 400) => { ctx.font = `${weight} ${size}px ${sans}`; };

      // 先测量，再决定卡片高度。
      const text = comment.value.trim();
      const quoteChars = Array.from(quote).length;
      const quoteSize = quoteChars <= 48 ? 40 : quoteChars <= 110 ? 34 : 32;
      const quoteLeading = Math.round(quoteSize * 1.75);
      const setQuote = () => { ctx.font = `400 ${quoteSize}px ${serif}`; };
      setQuote();
      const quoteLines = lines(ctx, quote, TEXT_W);
      setSans(COMMENT_SIZE);
      const commentLines = text ? lines(ctx, text, COMMENT_TEXT_W) : [];
      setSans(28, 500);
      const titleLines = lines(ctx, title, FOOT_TEXT_W);
      setSans(URL_SIZE);
      const urlLines = lines(ctx, linkText, FOOT_TEXT_W);

      const quoteBottom = QUOTE_TOP + quoteLines.length * quoteLeading;
      const commentTop = quoteBottom + 48;
      const commentHeight = commentLines.length ? 70 + commentLines.length * COMMENT_LEADING : 0;
      const bodyBottom = commentHeight ? commentTop + commentHeight : quoteBottom;
      const footerHeight = Math.max(titleLines.length * 38 + 14 + urlLines.length * URL_LEADING, hasQr ? QR_BOX : 0);
      const height = Math.ceil(Math.max(MIN_HEIGHT, bodyBottom + 84 + footerHeight + 64));
      const footerTop = height - 64 - footerHeight; // 落款贴底。
      // 短摘录时，正文在顶部与落款之间偏上居中，避免中间大片空白；内容撑满时不位移。
      const shift = Math.max(0, Math.floor((footerTop - 84 - bodyBottom) * 0.35));

      const scale = Math.min(2, Math.sqrt(12000000 / (WIDTH * height)));
      canvas.width = Math.ceil(WIDTH * scale);
      canvas.height = Math.ceil(height * scale);
      ctx.scale(scale, scale);

      // 纯色纸面：与弹窗底色拉开明度差，边界清楚，PNG 也更小。
      ctx.fillStyle = color('--surface');
      ctx.fillRect(0, 0, WIDTH, height);

      // 页眉：头像 + 站名，右侧标注“摘录”。
      if (avatar) {
        ctx.save();
        ctx.beginPath(); ctx.arc(PAD + 24, 84, 24, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, PAD, 60, 48, 48);
        ctx.restore();
      }
      ctx.fillStyle = color('--heading'); setSans(24, 500);
      ctx.fillText(siteName, PAD + 60, 92);
      ctx.fillStyle = color('--muted'); setSans(18, 500);
      ctx.textAlign = 'right'; ctx.fillText('摘录', WIDTH - PAD, 92); ctx.textAlign = 'left';

      // 原文
      ctx.fillStyle = color('--text'); setQuote();
      quoteLines.forEach((line, i) => ctx.fillText(line, PAD, QUOTE_TOP + shift + quoteSize + i * quoteLeading));

      // 评论：正文颜色，底色区分于原文；左侧细条作为引用线。
      if (commentHeight) {
        const cTop = commentTop + shift;
        ctx.fillStyle = color('--surface-2');
        ctx.fillRect(PAD, cTop, TEXT_W, commentHeight);
        ctx.fillStyle = color('--border');
        ctx.fillRect(PAD, cTop, 2, commentHeight);
        ctx.fillStyle = color('--muted'); setSans(16, 500);
        ctx.fillText('COMMENT', PAD + 28, cTop + 38);
        ctx.fillStyle = color('--text'); setSans(COMMENT_SIZE);
        commentLines.forEach((line, i) => ctx.fillText(line, PAD + 28, cTop + 84 + i * COMMENT_LEADING));
      }

      // 页脚：短线、标题与链接在左，二维码在右。
      ctx.strokeStyle = color('--border'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, footerTop - 36 + 0.5); ctx.lineTo(PAD + 44, footerTop - 36 + 0.5); ctx.stroke();
      ctx.fillStyle = color('--heading'); setSans(28, 500);
      titleLines.forEach((line, i) => ctx.fillText(line, PAD, footerTop + 28 + i * 38));
      ctx.fillStyle = color('--muted'); setSans(URL_SIZE);
      urlLines.forEach((line, i) => ctx.fillText(line, PAD, footerTop + titleLines.length * 38 + 14 + URL_SIZE + i * URL_LEADING));
      if (hasQr) {
        // 二维码保持黑白，并留足安静区，任何主题下都能扫。
        const x = WIDTH - PAD - QR_BOX;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, footerTop, QR_BOX, QR_BOX);
        const qr = qrCanvas(source, Math.round(QR_SIZE * scale));
        ctx.drawImage(qr, x + (QR_BOX - QR_SIZE) / 2, footerTop + (QR_BOX - QR_SIZE) / 2, QR_SIZE, QR_SIZE);
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob');
      if (version !== revision || !dialog.open) return;
      const nextUrl = URL.createObjectURL(blob);
      const oldUrl = imageUrl;
      imageUrl = nextUrl;
      image.src = imageUrl;
      image.hidden = false;
      image.alt = `${siteName} · ${title}。摘录：${quote}${text ? `。我的想法：${text}` : ''}`;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      file = new File([blob], `${location.pathname.split('/').filter(Boolean).pop()}-摘录.png`, { type: 'image/png' });
      // 系统分享只在触屏设备上显示；桌面端保留下载。
      let shareable = false;
      try { shareable = mobile.matches && !!navigator.share && !!navigator.canShare?.({ files: [file] }); } catch { /* 使用下载和长按保存。 */ }
      native.hidden = !shareable;
      save.disabled = native.disabled = false;
      renderStatus.hidden = true;
      if (!serifLoaded) status.textContent = '字体暂未加载，已使用系统衬线字体。';
    } catch {
      if (version !== revision) return;
      renderStatus.textContent = '图片生成失败，请重新打开分享重试。';
    }
  }
  toolbar.querySelector('[data-quote-share]').addEventListener('click', () => {
    if (Array.from(selected).length > 200) { inform('无法分享超过200字，最多分享200字。'); return; }
    if (!selected) return;
    priorFocus = document.activeElement;
    quote = selected;
    comment.value = '';
    image.hidden = true;
    toolbar.hidden = true;
    dialog.showModal();
    // 桌面端直接进入输入框；触屏设备不自动弹出键盘，焦点留在弹窗上。
    (mobile.matches ? dialog : comment).focus({ preventScroll: true });
    dialog.querySelector('.quote-save-hint').hidden = !mobile.matches;
    void render();
  });
  comment.addEventListener('input', render);
  save.addEventListener('click', () => {
    if (!file) return;
    const link = document.createElement('a');
    link.href = imageUrl; link.download = file.name;
    document.body.append(link); link.click(); link.remove();
    status.textContent = mobile.matches ? '已请求下载图片；也可长按预览图保存。' : '已请求下载 PNG 图片';
  });
  native.addEventListener('click', async () => {
    if (!file) return;
    native.disabled = true;
    try {
      // 文件已在预览阶段生成，直接响应点击，保留系统分享所需的用户激活。
      await navigator.share({ files: [file] });
      status.textContent = '已交给系统分享面板';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? '已取消分享，可以继续编辑或下载。' : '系统分享暂不可用，请下载或长按图片保存。';
    } finally { native.disabled = !file; }
  });
  dialog.querySelector('.quote-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
  dialog.addEventListener('close', () => {
    revision++;
    file = null;
    image.removeAttribute('src');
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = '';
    comment.value = '';
    toolbar.hidden = true;
    if (priorFocus instanceof HTMLElement && priorFocus !== document.body) priorFocus.focus({ preventScroll: true });
  });
})();
