# Kaiyi's Notes

Kaiyi 的个人博客，使用 [Hexo](https://hexo.io/) 构建，默认采用 [NexT](https://github.com/next-theme/hexo-theme-next) 主题，并通过 GitHub Actions 发布到 GitHub Pages。

## 本地预览

```bash
npm install
npm run dev
```

浏览器打开 <http://localhost:4000>。

## 写一篇新文章

```bash
npx hexo new post "文章标题"
```

Hexo 会在 `source/_posts/` 下创建 Markdown 文件。完成写作后运行 `npm run dev` 即可预览。

## 构建静态页面

```bash
npm run build
```

生成结果位于 `public/`，该目录会由 GitHub Actions 自动上传到 GitHub Pages。

## 发布到 Carri1Sun.github.io

1. 在 GitHub 创建名为 `Carri1Sun.github.io` 的公开仓库。
2. 将本地仓库连接到远程并推送：

   ```bash
   git remote add origin git@github.com:Carri1Sun/Carri1Sun.github.io.git
   git push -u origin main
   ```

3. 打开仓库的 **Settings → Pages**，在 **Build and deployment** 中将 **Source** 设为 **GitHub Actions**。
4. 等待仓库的 **Actions** 页面显示部署成功，然后访问 <https://Carri1Sun.github.io>。

以后每次向 `main` 分支推送，工作流都会自动重新构建并发布博客。

## 已准备的主题

- **NexT**：当前默认方案，采用经典极简布局，适合长期积累产品与技术文章。
- **Fluid**：带有大幅头图和文章卡片，视觉识别度更强。
- **Butterfly**：卡片化方案，视觉更活跃，适合希望首页内容更丰富的个人站。

主题预览配置保存在 `theme-previews/`，正式站点的主题由根目录 `_config.yml` 中的 `theme` 字段控制。
