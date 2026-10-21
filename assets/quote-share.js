// 文章摘录：原生选区 + 本地 Canvas PNG，无网络请求和持久化评论。
(() => {
  'use strict';
  const article = document.querySelector('.page-post .post-content');
  if (!article) return;
  const mobile = window.matchMedia('(any-pointer: coarse)');
  const title = document.querySelector('#post-title').textContent;
  const author = document.querySelector('meta[name="author"]').content;
  const source = document.querySelector('link[rel="canonical"]').href;
  const site = document.querySelector('meta[property="og:site_name"]').content;
  const toolbar = document.createElement('div');
  toolbar.className = 'quote-toolbar';
  toolbar.hidden = true;
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '选中文字操作');
  toolbar.innerHTML = '<button type="button" data-quote-copy>复制</button><button type="button" data-quote-share>分享摘录 ↗</button>';
  const notice = document.createElement('p');
  notice.className = 'quote-notice';
  notice.setAttribute('role', 'status');
  const dialog = document.createElement('dialog');
  dialog.className = 'quote-dialog';
  dialog.setAttribute('aria-labelledby', 'quote-heading');
  dialog.innerHTML = `<header class="quote-dialog-header"><div><p class="quote-kicker">WORDS TO KEEP / 留一段话</p><h2 id="quote-heading">分享摘录</h2></div><button type="button" class="quote-close" aria-label="关闭分享">×</button></header>
    <div class="quote-editor"><div class="quote-preview"><img alt="分享卡片预览，包含选中的原文、评论和文章来源" hidden><p class="quote-render-status" role="status">正在生成卡片…</p></div>
    <div class="quote-controls"><label for="quote-comment">写下你的想法 <span>可选</span></label><textarea id="quote-comment" maxlength="200" rows="4" placeholder="这一段，让我想到……" aria-describedby="quote-privacy"></textarea><p id="quote-privacy" class="quote-help">最多 200 字。评论仅用于生成图片，不会发布或上传。</p><div class="quote-buttons"><button type="button" data-quote-save disabled>下载图片</button><button type="button" data-quote-native hidden disabled>分享 / 保存图片</button></div><p class="quote-help quote-save-hint">PNG 图片 · 包含原文、评论与出处</p><p class="quote-export-status" role="status" aria-live="polite"></p></div></div>`;
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
        if (line && ctx.measureText(line + char).width > width) { result.push(line); line = ''; }
        line += char;
      }
      result.push(line);
    }
    return result;
  }
  async function render() {
    const version = ++revision;
    file = null;
    save.disabled = native.disabled = true;
    renderStatus.hidden = false;
    renderStatus.textContent = '正在生成卡片…';
    status.textContent = '';
    try {
      await document.fonts.ready;
      if (version !== revision || !dialog.open) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      const css = getComputedStyle(document.documentElement);
      const color = (name) => css.getPropertyValue(name).trim();
      const font = css.getPropertyValue('--font-sans');
      const setFont = (size, weight = 400) => { ctx.font = `${weight} ${size}px ${font}`; };
      setFont(30);
      const quoteLines = lines(ctx, quote, 592);
      setFont(23);
      const commentLines = comment.value.trim() ? lines(ctx, comment.value.trim(), 552) : [];
      setFont(23, 500);
      const titleLines = lines(ctx, title, 592);
      setFont(16);
      const sourceLines = lines(ctx, source, 592);
      const quoteBottom = 202 + quoteLines.length * 49;
      const commentHeight = commentLines.length ? 91 + commentLines.length * 37 : 0;
      const footerTop = quoteBottom + commentHeight + 35;
      const height = footerTop + 116 + titleLines.length * 35 + sourceLines.length * 25;
      // 限制像素总量，兼顾 iOS Canvas 内存限制；短卡片导出 2 倍分辨率。
      const scale = Math.min(2, Math.sqrt(12000000 / (720 * height)));
      canvas.width = Math.ceil(720 * scale);
      canvas.height = Math.ceil(height * scale);
      ctx.scale(scale, scale);
      ctx.fillStyle = color('--bg'); ctx.fillRect(0, 0, 720, height);
      ctx.fillStyle = color('--surface'); ctx.fillRect(24, 24, 672, height - 48);
      ctx.strokeStyle = color('--border'); ctx.strokeRect(24.5, 24.5, 671, height - 49);
      ctx.fillStyle = color('--muted'); setFont(15, 500);
      ctx.fillText('READING NOTES / 阅读摘录', 64, 80);
      ctx.strokeStyle = color('--border');
      ctx.beginPath(); ctx.moveTo(64, 103); ctx.lineTo(656, 103); ctx.stroke();
      ctx.fillStyle = color('--heading');
      ctx.font = '86px Georgia, serif'; ctx.fillText('“', 58, 189);
      setFont(30); ctx.fillStyle = color('--text');
      quoteLines.forEach((line, i) => ctx.fillText(line, 64, 220 + i * 49));
      if (commentLines.length) {
        ctx.fillStyle = color('--surface-2'); ctx.fillRect(64, quoteBottom + 25, 592, commentHeight - 5);
        ctx.fillStyle = color('--muted'); setFont(14, 500); ctx.fillText('COMMENT / 我的想法', 84, quoteBottom + 61);
        ctx.fillStyle = color('--text'); setFont(23);
        commentLines.forEach((line, i) => ctx.fillText(line, 84, quoteBottom + 104 + i * 37));
      }
      ctx.strokeStyle = color('--border');
      ctx.beginPath(); ctx.moveTo(64, footerTop); ctx.lineTo(656, footerTop); ctx.stroke();
      setFont(16); ctx.fillStyle = color('--muted'); ctx.fillText(`摘自 ${author} 的文章`, 64, footerTop + 38);
      setFont(23, 500); ctx.fillStyle = color('--heading');
      titleLines.forEach((line, i) => ctx.fillText(line, 64, footerTop + 76 + i * 35));
      setFont(16); ctx.fillStyle = color('--muted');
      sourceLines.forEach((line, i) => ctx.fillText(line, 64, footerTop + 85 + titleLines.length * 35 + i * 25));
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob');
      if (version !== revision || !dialog.open) return;
      const nextUrl = URL.createObjectURL(blob);
      const oldUrl = imageUrl;
      imageUrl = nextUrl;
      image.src = imageUrl;
      image.hidden = false;
      image.alt = `${site} · ${title}。摘录：${quote}${comment.value.trim() ? `。我的想法：${comment.value.trim()}` : ''}`;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      file = new File([blob], `${location.pathname.split('/').filter(Boolean).pop()}-摘录.png`, { type: 'image/png' });
      let shareable = false;
      try { shareable = !!navigator.share && !!navigator.canShare?.({ files: [file] }); } catch { /* 使用下载和长按保存。 */ }
      native.hidden = !shareable;
      save.disabled = native.disabled = false;
      renderStatus.hidden = true;
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
    dialog.querySelector('.quote-save-hint').textContent = mobile.matches
      ? '可长按预览图片保存；支持的浏览器也可打开系统分享面板。'
      : 'PNG 图片 · 包含原文、评论与出处';
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
