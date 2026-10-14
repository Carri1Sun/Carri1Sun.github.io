import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildSite } from './build.ts';
import { handleEditor } from './local-editor.ts';
import { projectRoot } from './lib/draft.ts';

test('本地写作：令牌、跨站请求、创建、重名保护与输入校验', async () => {
  const server = http.createServer(async (req, res) => {
    if (!await handleEditor(req, res, new URL(req.url!, 'http://localhost').pathname)) res.writeHead(404).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const slug = `editor-test-${Date.now()}`;
  const files = [`content/posts/${slug}.md`, `content/notes/2026-10-14-${slug}.md`];
  try {
    const page = await (await fetch(`${base}/__editor`)).text();
    const token = /'X-Editor-Token':'([a-f0-9]+)'/.exec(page)?.[1];
    assert(token);
    const submit = (body: object, headers: Record<string, string> = {}) => fetch(`${base}/__editor/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': token, ...headers }, body: JSON.stringify(body),
    });
    assert.equal((await submit({}, { 'X-Editor-Token': '' })).status, 403);
    assert.equal((await submit({}, { Origin: 'https://example.com' })).status, 403);
    assert.equal((await submit({ kind: 'post', title: '' })).status, 400);
    assert.equal((await submit({ kind: 'note', body: '' })).status, 400);
    assert.equal((await submit({ kind: 'post', title: '测试', date: 'invalid' })).status, 400);
    assert.equal((await submit({ kind: 'post', title: 123 })).status, 400);
    const post = { kind: 'post', title: '写作测试', slug, date: '2026-10-14 12:00:00', body: '原文\n\n[链接](https://example.com)', categories: 'Agent、产品' };
    const created = await submit(post);
    assert.equal(created.status, 201);
    assert.equal((await created.json()).url, `/posts/${slug}/`);
    const before = await fs.readFile(path.join(projectRoot, files[0]!), 'utf8');
    assert(before.includes('原文\n\n[链接](https://example.com)'));
    assert(before.includes('date: 2026-10-14 12:00:00'));
    assert.equal((await submit({ ...post, body: '覆盖内容' })).status, 400);
    assert.equal(await fs.readFile(path.join(projectRoot, files[0]!), 'utf8'), before);
    const note = await submit({ kind: 'note', slug, date: '2026-10-14', body: '随笔测试', pinned: true });
    assert.equal(note.status, 201);
    assert.equal((await note.json()).url, `/notes/#2026-10-14-${slug}`);
    const content = await fs.readFile(path.join(projectRoot, files[1]!), 'utf8');
    assert(content.includes('pinned: true'));
    assert(!content.includes('title:'));
    assert.equal((await fetch(`${base}/__editor/create`)).status, 405);
    assert.equal((await fetch(`${base}/__editor/missing`)).status, 404);
  } finally {
    for (const file of files) await fs.rm(path.join(projectRoot, file), { force: true });
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('生产构建不包含本地写作入口、页面或接口代码', async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-editor-build-'));
  try {
    await buildSite({ outDir });
    const entries = await fs.readdir(outDir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      assert(!entry.name.includes('__editor'));
      if (!entry.isFile() || !/\.(html|js)$/.test(entry.name)) continue;
      const content = await fs.readFile(path.join(entry.parentPath, entry.name), 'utf8');
      assert(!content.includes('/__editor'), entry.name);
      assert(!content.includes('X-Editor-Token'), entry.name);
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});
