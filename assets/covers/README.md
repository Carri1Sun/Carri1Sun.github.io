# 文章封面图片

将封面图片放在此目录，建议使用小写英文文件名和 WebP、JPEG 或 PNG 格式。
图片会随构建复制到 dist/assets/covers/ 并部署，无需单独上传。

在文章 frontmatter 中填写：

```yaml
cover: /assets/covers/my-cover.webp
```

也支持 `assets/covers/my-cover.webp`，构建时自动补齐开头的 `/`。
路径以网站根目录为准，不使用电脑绝对路径或相对文章路径。
文件名大小写需完全一致，以兼容远端 Linux / GitHub Pages。

外部图片使用完整 HTTPS 地址：

```yaml
cover: https://example.com/images/my-cover.webp
```

图片直接由浏览器加载，无需 CORS 授权，但图片服务必须允许外链访问。
书名、分类、年份保留自动排版，图片填充下方图案区域，居中裁切。
图片加载失败时回退到轨道图案。

预设封面：`orbit`（0，轨道）、`frames`（1，矩形）、`steps`（2，阶梯）、`rays`（3，放射线）。
未配置或留空时使用 `orbit`，预设颜色自动适配暗色模式。
