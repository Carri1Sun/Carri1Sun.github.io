---
title: 从 Hover 卡片触发理解 CSS transform rotate
date: 2026-09-16 01:05:01
categories:
  - 工程实践
tags:
  - CSS
  - 前端
  - 动效
excerpt: 从一个悬停时会侧身扶正的封面卡片出发，拆解 CSS transform rotate 的实现与用法，理清"X/Y/Z 指绕哪根轴旋转"这个核心概念，并对应到刚体转动、欧拉角等数学物理知识。
description: 用一个 hover 卡片倾斜效果讲透 CSS rotate 的用法与坐标系理解，关联刚体力学与欧拉角。
cover: frames
---

最近总能刷到一种很流行的卡片交互：卡片平时微微歪着、稍微侧过一点身，鼠标悬停时轻轻抬起并摆正——很多产品官网和作品集都在用，有的还会让卡片跟着鼠标转。我一直猜测，这种“3D 倾斜”背后应该有一个专门的 3D 过渡 API 之类的东西。

于是我跟 AI 一起把这个效果实现了一遍，顺便把原理弄清楚。结果整件事只由四行很普通的 CSS 组成。这篇文章就从这四行出发，讲清楚 `rotate` 的用法、坐标系里“绕哪根轴”这个关键概念，最后对应到几处我们在数学课和物理课上学过的知识。我把整个学习和尝试的过程做成了一个可以交互的实验台，嵌在文章里。

<iframe src="/assets/rotate-demo.html" title="CSS rotate 三轴交互实验台" loading="lazy" style="width: 100%; height: 1330px; border: 1px solid #2d3342; border-radius: 10px; background: #0f1117; color-scheme: dark;"></iframe>

如果你在 RSS 阅读器里看不到交互效果，可以[在新标签页打开这个实验台](/assets/rotate-demo.html)。

## 会侧身的卡片：四行 CSS

跟 AI 尝试实现时，核心代码就长这样：

```css
.book-display {
  perspective: 1000px;                        /* ① 父容器上立一台"摄像机" */
}
.book-display .book-object {
  transform: rotate(-4deg) rotateY(-8deg);    /* ② 静态姿态：平面打歪 + 立体侧转 */
  transition: transform 0.45s cubic-bezier(0.2, 0.6, 0.2, 1);  /* ③ 动画引擎 */
}
.book-display:hover .book-object {
  transform: translateY(-9px) rotate(-1deg) rotateY(-4deg);    /* ④ 悬停：抬起并扶正 */
}
```

逐行拆开看：

- **② 是倾斜本身。** `rotateY(-8deg)` 让封面绕竖直轴侧转一点，`rotate(-4deg)` 让它平面方向歪一点。组合起来就是"随手放在桌上的书"那种姿态。
- **① 提供立体感。** `perspective: 1000px` 模拟一台距离元素 1000px 的摄像机，元素上离你近的部分被画得大、远的部分被画得小。把它去掉，`rotateY` 就只剩把卡片水平压扁。
- **③④ 是"动起来"的部分。** `transition` 盯着 `transform` 属性，在两个状态（平时 vs 悬停）之间做插值。我原本以为存在的那个"3D 过渡 API"，实际承担者是 CSS transition 对 `transform` 值的普通插值。

所以完整的心理模型只有三个原语：**`transform` 管几何（转成什么样），`perspective` 管投影（立体感能否被看见），`transition` 或 `animate()` 管插值（怎么动过去）。**

顺带一提，浏览器里确实存在一个原生的动画 API——Web Animations API（WAAPI），用 JS 写关键帧，很适合驱动这类旋转（比如翻书、卡片翻转的开场动画）：

```ts
node.animate(
  [
    { transform: 'rotateY(0deg)' },
    { transform: 'rotateY(-18deg)', offset: 0.16 },
    { transform: 'rotateY(-168deg)' },
  ],
  { duration: 480, easing: 'cubic-bezier(.22,.7,.15,1)', fill: 'both' },
);
```

它的能力等价于 CSS 的 `@keyframes`，但可以在 JS 里动态计算参数，还能拿到 `animation.finished` Promise 做时序编排——比如等封面翻完、纸页再依次错峰翻动。不过这只是“驱动方式”的差别，旋转的几何规则和 CSS 完全一致。

## 用法：三个函数、一个前提、一个基准点

`transform` 里和旋转相关的函数一共这几个：

| 函数 | 含义 |
|---|---|
| `rotate(30deg)` | 平面旋转，`rotateZ(30deg)` 的简写 |
| `rotateX(30deg)` | 绕横轴转：顶边远去、底边靠近，像向前翻倒 |
| `rotateY(30deg)` | 绕竖轴转：右边缘远去、左边缘靠近，像绕门框开门 |
| `rotate3d(x, y, z, a)` | 绕一根自定义方向的斜轴转，一次到位 |

两个容易漏掉的配套知识：

**`perspective` 要写在父容器上。** 它定义的是"观察者的位置"，语义上属于场景而非单个元素。写在元素自己的 `transform` 里也有等价形式（`transform: perspective(800px) rotateY(30deg)`），但写在父容器上时多个子元素共享同一台摄像机，空间关系才一致。实验台 B 区最下面两张"对照组"卡片去掉了它，同样的 `rotateY` 只剩下正交投影式的压扁。

**`transform-origin` 是转轴经过的基准点。** 默认在元素中心。类比很直接：2D 的 `rotate()` 绕一个点转，就像杠杆绕支点；3D 里三根转轴都穿过 `transform-origin`。把 origin 放到左边缘，`rotateY` 就从“卡片侧身”变成“门绕门框开合”，翻书动画正是这么设置的（`transform-origin: 0 50%`）。

还有一个进阶细节：transform 按书写顺序复合。`rotate(-4deg) rotateY(-24deg)` 和 `rotateY(-24deg) rotate(-4deg)` 结果不同——先歪再侧转，和先侧转再歪，参照系已经变了。实验台 C 区提供了一个顺序切换开关，同样的角度能直观看到姿态差异。

## 关键理解：X/Y/Z 说的是"绕哪根轴"

这是我这轮讨论里最大的收获。我最初把 `rotateX / rotateY / rotateZ` 理解成"往三个方向转动"，于是自然产生了两个疑问：

**疑问一：看起来是 3D 的，只用 X 和 Y 就够了吗？不需要 Z 吗？**

答案藏在坐标系里。CSS 的 3D 空间是这样的：

```
Y轴（竖直，朝下！）
↓
│   ↖ Z轴（垂直于屏幕，指向你的眼睛）
│  ／
│ ／
●──────────→ X轴（水平，向右）
```

`rotateX/Y/Z` 的字母指的是**旋转围绕的那根轴**，轴本身不动，元素绕着它转。地轴、门轴、陀螺的对称轴，都是这个图景。三个函数的分工：

- `rotateX`：绕横轴，像跳水运动员向前翻滚；
- `rotateY`：绕竖轴，像门绕门框转；
- `rotateZ`：绕"戳向你眼睛"的视轴，转出来就是屏幕平面内的普通旋转。

所以其实我一直都在用 Z——封面那个"歪歪地摆放"的 `rotate(-4deg)`，全名就是 `rotateZ(-4deg)`。完整的公式是：**平面打歪用 Z，立体侧转用 X/Y，两个一起用。**

而 3D 感的出现完全不需要手动去"转 Z"：`rotateY(-8deg)` 发生时，元素上的每个点自动在 Z 轴（深度）上重新分布，一侧进入负 Z 远离你、一侧进入正 Z 靠近你，`perspective` 再把这种深度差渲染成近大远小。**Z 轴是深度本身，rotateX/Y 是让点穿过 Z 空间的手段。** 真想直接操作 Z，那是 `translateZ`（沿深度平移，让元素"浮出来"）的职责，与旋转无关。

**疑问二：rotate 和 translate 的 X/Y/Z，语义一样吗？**

一样的是字母，不一样的是关系：

| 函数 | 字母的含义 | 类比 |
|---|---|---|
| `rotateX/Y/Z` | **绕**哪根轴旋转 | 门绕门轴 |
| `translateX/Y/Z` | **沿**哪根轴移动 | 电梯沿井道 |

同一个字母在两个函数里，一个说"轴"，一个说"方向"。分清这一条，再看 `rotate3d(x, y, z, angle)`（绕一根任意方向的斜轴转）也就顺理成章了。

## 对应的数学与物理

把概念理顺之后会发现，这套东西在数学课和物理课里都见过。

### 刚体绕轴转动

"旋转由一根轴定义"正是刚体力学的基本图景。物理里角速度 **ω 是矢量，方向就定义在转轴上**：右手定则，四指弯向旋转方向，拇指指向 ω。转得多快是它的模长，绕哪根轴转是它的方向——`rotateX/Y/Z` 本质上就是分别在三个基向量方向上指定旋转。

2D 到 3D 的升级也有老朋友：2D `rotate()` 绕一个点（`transform-origin`），对应杠杆绕支点、圆周运动绕圆心；升到 3D，"绕点"推广成"绕轴"，旋转的自由度从 1 个变成 3 个。

### 欧拉角：为什么顺序重要

上一节说 `rotate` 的书写顺序会改变结果，这并非 CSS 的怪癖，正是**欧拉角**的经典性质：任意 3D 姿态都可以分解为三次绕轴旋转，且复合顺序不同、结果不同（绕自身转轴的 intrinsic 旋转）。飞机姿态里的俯仰、偏航、滚转，与 `rotateX/rotateY/rotateZ` 一一对应。欧拉角玩到极端还会出现万向锁，CSS transform 里同样能复现出来。

### 旋转矩阵与轴角表示

线性代数视角下，`rotateX/Y/Z` 各对应一个标准旋转矩阵，连续书写就是矩阵连乘——顺序会改变结果的原因也在这里。`rotate3d(x, y, z, angle)` 则是**轴角表示**：给定一根任意方向的轴和角度，一次描述任意旋转，数学上对应罗德里格斯旋转公式。

### 一个坐标系陷阱

数学和物理的惯例里 Y 朝上、正角逆时针（右手系）。CSS 里 **Y 朝下**，于是 `rotate(30deg)` 在屏幕上是顺时针。这解释了为什么背公式容易晕，而拿"绕哪根轴"来理解反而稳——坐标系可以翻，轴的关系不变。

## 小结

从一次"这个效果是怎么做的"的好奇出发，最后的收获是一张极简的地图：

- **倾斜的姿态** = `rotateZ`（平面打歪）+ `rotateX/Y`（立体侧转）；
- **立体感** = 父容器的 `perspective`，把旋转产生的深度差渲染成近大远小；
- **动效** = `transition` 或 `element.animate()` 在两个 transform 状态之间插值；
- **概念核心** = rotate 的 X/Y/Z 指围绕哪根轴旋转，方向归 translate 管；
- **背后的知识** = 刚体绕轴转动（ω 沿转轴）、欧拉角（顺序与万向锁）、旋转矩阵与轴角（罗德里格斯公式）。

没有任何专门的"3D API"。这几个原语拼起来，就足够做出卡片倾斜、翻书动画，乃至完整的 3D 场景。
