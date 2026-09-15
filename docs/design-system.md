# Peach & Ink 色彩与字体规范

以指定的 `#FCD0B1` 桃色作为全站浅色背景，纯黑用于正文、标题和默认链接。暖黑暗色主题保留桃色品牌识别。颜色统一维护在 `assets/style.css` 的主题变量中。

## 语义色彩

| 用途 / CSS 变量 | 浅色 | 暗色 |
| --- | --- | --- |
| 页面背景 `--bg` | `#FCD0B1` | `#211C19` |
| 纸片、搜索、代码块 `--surface` | `#FFE4CF` | `#2D2520` |
| 次级表面、行内代码 `--surface-2` | `#EFBC99` | `#3B3029` |
| 标题 `--heading` | `#000000` | `#FCD0B1` |
| 正文 `--text` | `#000000` | `#F5DECC` |
| 日期、摘要等次级文字 `--muted` | `#614d41` | `#C2A895` |
| 分割线 `--border` | `#B48B70` | `#705A4B` |
| 品牌、链接、焦点 `--brand` / `--accent` | `#000000` | `#FCD0B1` |
| 链接悬停 `--accent-strong` | `#75412E` | `#FFF0E4` |
| 轻量选中底色 `--accent-soft` | `#00000009` | `#FCD0B110` |
| 文本选中背景 / 文字 | `#000000` / `#FCD0B1` | `#FCD0B1` / `#211C19` |

正文链接使用下划线，焦点使用 2px 轮廓，当前导航使用底线，避免仅靠颜色传达状态。分割线仅作装饰，不承担交互状态的唯一标识。

书封使用四种辅助色：暖黑、陶土、鼠尾草绿、浅桃纸色。暗色下分别调整亮度；浅色书封继续使用黑字，深色书封使用桃色字。辅助色用于图形与书封，正文遵循语义文字色。代码语法高亮采用陶土、森林绿、灰蓝和灰紫，并为暗色单独定义。

## 字体

- **中文展示标题：站酷庆科黄油体（ZCOOL QingKe HuangYou）**。窄身、圆角和切角笔画用于书名、列表页与关于页标题、首页签名。使用原生 400 字重，避免合成粗体。
- **英文及数字：Space Grotesk**。用于站点名称、标题与界面标签中的拉丁文字，提供 300–700 可变字重。
- **正文与文章标题：IBM Plex Sans + IBM Plex Sans SC**。英文与数字用 IBM Plex Sans，中文用 IBM Plex Sans SC（简体中文），提供 Regular 400 与 Medium 500 两档。文章正文 16.5px / 行高 1.85，随笔 18px / 行高 1.9；文章页大标题与正文内的 markdown 标题（h1–h6，500 字重）同样使用这套字体。
- **代码与细小编号：系统等宽字体**。优先 SF Mono、Menlo、Consolas。
- 全站移除宋体、衬线字体栈。字体失败时回退到系统无衬线字体。

字体文件保存在 `assets/fonts/`，以 WOFF2 本地托管并预加载，使用 `font-display: swap`，不阻塞正文显示。保留完整字库以支持后续新增文章。各字体均遵循 SIL Open Font License 1.1，许可证随文件保存。仅转换存储格式，未修改字形。

字体来源与设计说明：

- [Google Fonts：站酷庆科黄油体](https://github.com/google/fonts/tree/main/ofl/zcoolqingkehuangyou)
- [Space Grotesk 官方仓库](https://github.com/floriankarsten/space-grotesk)
- [Google Fonts：Space Grotesk 可变字体](https://github.com/google/fonts/tree/main/ofl/spacegrotesk)
- [IBM Plex 官方仓库](https://github.com/IBM/plex)（`@ibm/plex-sans`、`@ibm/plex-sans-sc` 1.1.0，Regular 与 Medium，未修改字形）

## 使用约定

新增组件优先引用语义变量，不直接加入新的红色或独立配色。浅色大面积保持桃色，纸片使用更浅的桃色；暗色大面积使用暖黑，阅读文字采用暖白，标题与焦点采用桃色。新增页面复用现有布局模板，即可获得字体预加载和主题切换。
