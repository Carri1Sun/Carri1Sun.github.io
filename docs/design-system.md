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
- **正文与文章标题：IBM Plex Sans + IBM Plex Sans SC**。英文与数字用 IBM Plex Sans，中文用 IBM Plex Sans SC（简体中文），提供 Regular 400 与 Medium 500 两档。文章正文在桌面使用 18px / 行高 1.75，在手机使用 16px / 行高 1.85，正文栏最大宽度为 720px；随笔使用 18px / 行高 1.9。文章页大标题与正文内的 Markdown 标题（h1–h6，500 字重）同样使用这套字体。
- **代码与细小编号：系统等宽字体**。优先 SF Mono、Menlo、Consolas。
- 页面正文与界面使用无衬线字体；分享卡片的原文使用本地托管的 Noto Serif SC Regular 宋体，评论和出处沿用 IBM Plex Sans。宋体只在打开分享时加载，生成图片前等待字体就绪，失败时回退到系统衬线字体并提示。

字体文件保存在 `assets/fonts/`，以 WOFF2 本地托管。页面字体预加载，分享宋体按需加载，使用 `font-display: swap`，不阻塞正文显示。保留完整字库以支持后续新增文章。各字体均遵循 SIL Open Font License 1.1，许可证随文件保存。仅转换存储格式，未修改字形。

字体来源与设计说明：

- [Google Fonts：站酷庆科黄油体](https://github.com/google/fonts/tree/main/ofl/zcoolqingkehuangyou)
- [Space Grotesk 官方仓库](https://github.com/floriankarsten/space-grotesk)
- [Google Fonts：Space Grotesk 可变字体](https://github.com/google/fonts/tree/main/ofl/spacegrotesk)
- [Google Fonts：Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc)（固定 400 字重后转换为 WOFF2，保留完整字库，许可证见 `assets/fonts/OFL-Noto-Serif-SC.txt`）
- [IBM Plex 官方仓库](https://github.com/IBM/plex)（`@ibm/plex-sans`、`@ibm/plex-sans-sc` 1.1.0，Regular 与 Medium，未修改字形）

## 使用约定

新增组件优先引用语义变量，不直接加入新的红色或独立配色。浅色大面积保持桃色，纸片使用更浅的桃色；暗色大面积使用暖黑，阅读文字采用暖白，标题与焦点采用桃色。新增页面复用现有布局模板，即可获得字体预加载和主题切换。

## Header

所有页面通过 `scripts/components/header.ts` 的 `Header()` 共用品牌、头像、导航、搜索和主题切换。Header 使用全宽布局，桌面左右留白为 36px、高度为 92px；640px 及以下左右留白为 24px，最小高度为 78px，品牌与导航可换行。Header 独立于正文容器，切换页面时头像、站名和导航保持对齐。

Header 在首页与所有内页中始终固定在顶部，并使用半透明背景。首页显示底边线，内页保持无底边线样式。首页正文继续沿用书架布局；文章的沉浸模式保留 Header，将重新打开目录的图标放在 Header 下方左上角。

## 分享卡片

卡片以单张暖色纸面呈现，采用主题中的 `--surface` 与 `--bg` 形成轻微渐变，不使用嵌套边框。原文使用常规字重的宋体，按摘录长度选择 40 / 34 / 30px 字号，行高约为字号的 1.75 倍；通过留白与字体层次形成书摘感，不添加装饰引号，顶部保留“摘录”标签。评论使用 `--surface-2` 底色，配细竖线、内边距和 22px 无衬线文字；“摘录自”站点、文章标题和来源链接位于底部，以短横线分隔。明暗主题共用相同排版和语义色。预览与下载使用同一张 PNG。
