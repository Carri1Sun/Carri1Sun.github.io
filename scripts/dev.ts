// 开发服务器：构建 + 静态托管 + 文件变更自动重建 + 浏览器热刷新。
//
//   npm run dev    # http://localhost:4000

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { buildSite } from './build.ts';

const projectRoot = path.resolve(import.meta.dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');
const port = Number(process.env.PORT) || 4000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/* ---------------------------------- 构建与监听 ---------------------------------- */

let rebuildTimer: NodeJS.Timeout | null = null;
const liveSockets = new Set<http.ServerResponse>();

async function rebuild(reason: string): Promise<void> {
  const started = Date.now();
  try {
    await buildSite({ livereload: true, log: () => {} });
    console.log(`[${reason}] 重建完成，用时 ${Date.now() - started}ms`);
    for (const res of liveSockets) res.write('data: reload\n\n');
  } catch (error) {
    console.error(`[${reason}] 构建失败：`, error);
  }
}

function scheduleRebuild(reason: string): void {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    void rebuild(reason);
  }, 100);
}

// 监听项目根目录，再按路径过滤要重建的变更：
//  - 只关心 content/、assets/、scripts/ 与 site.config.js
//  - 必须排除 dist/：重建会写入 dist/，不排除的话重建本身会再次触发监听，形成死循环
//    （macOS 下对单个文件的 fs.watch 底层是 FSEvents，实际会监听到父目录）
//  - 跳过 .DS_Store、编辑器临时文件等噪声
const WATCHED_PREFIXES = ['content/', 'assets/', 'scripts/'];

function changedWatchedFile(rawFile: string | Buffer | null): string | null {
  if (!rawFile) return null; // 拿不到文件名时无法判断，跳过（启动时已构建过一次）
  let file = String(rawFile);
  if (path.isAbsolute(file)) file = path.relative(projectRoot, file);
  if (file === 'site.config.ts' || file === 'site.config.js') return file;
  if (!WATCHED_PREFIXES.some((prefix) => file.startsWith(prefix))) return null;
  if (path.basename(file).startsWith('.')) return null;
  return file;
}

fs.watch(projectRoot, { recursive: true }, (_event, rawFile) => {
  const file = changedWatchedFile(rawFile);
  if (file) scheduleRebuild(file);
});

/* ---------------------------------- HTTP 服务 ---------------------------------- */

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);

  if (pathname === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    liveSockets.add(res);
    req.on('close', () => liveSockets.delete(res));
    return;
  }

  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  let filePath = path.normalize(path.join(distDir, relative));
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let status = 200;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, '404.html');
    status = 404; // 与 GitHub Pages 行为一致
  }

  const body = fs.readFileSync(filePath);
  res.writeHead(status, {
    'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
});

await rebuild('启动');
server.listen(port, () => {
  console.log(`博客开发服务器已启动：http://localhost:${port}`);
  console.log('监听 content/、assets/、scripts/ 变更，保存后自动重建并刷新页面。');
});
