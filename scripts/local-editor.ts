// 仅由开发服务器提供；编辑器和写入接口均不进入 dist/。
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { projectRoot } from './lib/draft.ts';

const token = randomBytes(32).toString('hex');
const endpoint = '/__editor';

export const editorLink = '<a class="nav-link" href="/__editor">写作</a>';

export function editorPage(): string {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>本地写作 · Kaiyi's Blog</title><link rel="stylesheet" href="/assets/style.css">
<style>
body{padding:32px 20px}main{max-width:800px;margin:auto}h1{margin:24px 0 8px}p{line-height:1.7}
form{display:grid;gap:20px;margin-top:28px}label{display:grid;gap:8px}input,textarea,select,button{font:inherit}
input,textarea,select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #b9b4ab;border-radius:8px;background:transparent;color:inherit}
textarea{min-height:320px;resize:vertical;line-height:1.7}details label{margin-top:16px}summary{cursor:pointer}
button{padding:12px 24px;border:0;border-radius:8px;background:#252a24;color:white;cursor:pointer;justify-self:start}
button:disabled{opacity:.5}label.check{display:flex;align-items:center}input[type=checkbox]{width:auto}
[hidden]{display:none!important}#result{white-space:pre-wrap;padding:16px;border:1px solid #b9b4ab;border-radius:8px}#result:empty{display:none}
</style></head><body><main><a href="/">← 返回博客</a><h1>本地写作</h1>
<p>填写内容即可创建 Markdown，保存后自动更新本地预览。文件会参与下次发布，推送 Git 后上线。</p>
<form id="editor">
<label>内容类型<select name="kind"><option value="post">文章</option><option value="note">随笔</option></select></label>
<label data-post>标题<input name="title" required placeholder="给这篇文章起个标题"></label>
<label>正文（Markdown）<textarea name="body" placeholder="从这里开始写……"></textarea></label>
<details><summary>更多选项 · 文件名、日期、分类与封面</summary>
<label>文件名 / 永久链接标识<input name="slug" placeholder="自动生成，也可填写 short-slug" maxlength="80"></label>
<label>日期<input name="date" placeholder="留空使用当前北京时间；YYYY-MM-DD HH:mm:ss"></label>
<div data-post><label>分类<input name="categories" placeholder="Agent、产品"></label>
<label>标签<input name="tags" placeholder="AI Agent、实践"></label>
<label>摘要<input name="excerpt" placeholder="留空自动使用正文摘要"></label>
<label>SEO 描述<input name="description"></label>
<label>封面<input name="cover" placeholder="默认 orbit；可填 frames / steps / rays 或图片路径"></label></div>
<label class="check" data-note hidden><input type="checkbox" name="pinned">置顶随笔</label>
</details>
<button type="submit">保存并创建文件</button>
</form><div id="result" role="status" aria-live="polite"></div>
<script>
const form=document.querySelector('#editor'),result=document.querySelector('#result'),button=form.querySelector('button');
const storageKey='kaiyi-local-editor';
function syncKind(){const post=form.elements.kind.value==='post';document.querySelectorAll('[data-post]').forEach(el=>el.hidden=!post);document.querySelectorAll('[data-note]').forEach(el=>el.hidden=post);form.elements.title.required=post;form.elements.body.required=!post;}
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved)for(const [key,value]of Object.entries(saved)){const field=form.elements.namedItem(key);if(field){if(field.type==='checkbox')field.checked=value;else field.value=value;}}}catch{}
syncKind();
function values(){const data=Object.fromEntries(new FormData(form));data.pinned=form.elements.pinned.checked;return data;}
form.addEventListener('input',()=>{syncKind();try{localStorage.setItem(storageKey,JSON.stringify(values()));}catch{}});
form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;result.textContent='正在创建文件……';try{
const response=await fetch('${endpoint}/create',{method:'POST',headers:{'Content-Type':'application/json','X-Editor-Token':'${token}'},body:JSON.stringify(values())});
const data=await response.json();if(!response.ok)throw Error(data.error);
result.textContent='已保存：'+data.file+'\\n本地页面正在自动重建。';
const link=document.createElement('a');link.href=data.url;link.textContent='打开预览 →';link.style.display='block';result.append(link);
try{localStorage.removeItem(storageKey);}catch{}
form.reset();syncKind();
}catch(error){result.textContent=error.message;}finally{button.disabled=false;}});
</script></main></body></html>`;
}

function json(res: ServerResponse, status: number, data: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

export async function handleEditor(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (pathname !== endpoint && !pathname.startsWith(`${endpoint}/`)) return false;
  if (pathname === endpoint && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' });
    res.end(editorPage());
    return true;
  }
  if (pathname !== `${endpoint}/create`) { json(res, 404, { error: '页面不存在' }); return true; }
  if (req.method !== 'POST') { json(res, 405, { error: '请使用 POST' }); return true; }
  // 随机令牌和同源校验阻止其他网页向本机写入文件。
  if (req.headers['x-editor-token'] !== token || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) {
    json(res, 403, { error: '请从本地写作页面提交' }); return true;
  }
  try {
    if (!req.headers['content-type']?.startsWith('application/json')) throw Error('请提交 JSON 内容');
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of req) {
      const buffer = Buffer.from(chunk);
      length += buffer.length;
      if (length > 1024 * 1024) { json(res, 413, { error: '内容不能超过 1 MB' }); return true; }
      chunks.push(buffer);
    }
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('内容格式不正确');
    const input = data as Record<string, unknown>;
    const kind = input.kind;
    if (kind !== 'post' && kind !== 'note') throw Error('请选择文章或随笔');
    const field = (name: string): string => {
      const value = input[name];
      if (value === undefined) return '';
      if (typeof value !== 'string') throw Error(`${name} 必须是文本`);
      if (name !== 'body' && value.length > 2000) throw Error(`${name} 过长`);
      return value;
    };
    const title = field('title').trim();
    const body = field('body');
    if (kind === 'post' && !title) throw Error('请填写文章标题');
    if (kind === 'note' && !body.trim()) throw Error('请填写随笔正文');
    const slug = field('slug').trim() || (kind === 'post' ? title : `note-${Date.now()}-${randomBytes(3).toString('hex')}`);
    const args = [path.join(projectRoot, `scripts/new-${kind}.ts`), `--slug=${slug}`, '--body=-'];
    if (kind === 'post') args.push(`--title=${title}`);
    for (const name of ['date', ...(kind === 'post' ? ['categories', 'tags', 'excerpt', 'description', 'cover'] : [])]) {
      const value = field(name).trim();
      if (value) args.push(`--${name}=${value}`);
    }
    if (kind === 'note' && input.pinned === true) args.push('--pinned');
    const output = await new Promise<string>((resolve, reject) => {
      const child = execFile(process.execPath, args, { cwd: projectRoot, timeout: 15000 }, (error, stdout, stderr) => {
        if (error) reject(Error(stderr.trim() || '创建失败')); else resolve(stdout);
      });
      child.stdin?.on('error', () => {});
      child.stdin?.end(body);
    });
    const file = /^已创建：(.+)$/m.exec(output)?.[1];
    const url = /^URL: (.+)$/m.exec(output)?.[1];
    if (!file || !url) throw Error('无法读取创建结果');
    json(res, 201, { file, url });
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : '创建失败' });
  }
  return true;
}
