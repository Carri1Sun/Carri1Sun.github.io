---
title: "施工时怎样选择模型以及 effort/thinking 等级"
date: 2026-10-11 03:19:24
author: Kaiyi
categories: []
tags: []
excerpt: ""
---
最近读了四篇文章，讲的都是在使用 Claude Code 或者 API 时应该怎么样选择模型以及 effort

首先是因为这个事情跟我最近做的工作主题「评测」关联性也很强，另外，它是最接近普通人的评测，我们大家在用模型或者用 agent 的时候现在往往都会有选择困难症，我们会综合速度，开销，以及比较抽象的“性能”一词去权衡考虑，这之中最令人没头绪的往往是性能这个词（哦！又一个抽象词汇，前两天我刚刚喷过爱用抽象词汇的人）。所以我觉得搞清楚此问题是必要的。

anthropic 虽然反华且封号严重，但是他们内部人员在分享知识层面真的是堪称做慈善，在本文接下来的篇章中，我们一起读一下这四篇 anthropic 的文章，他们里面讲的内容大差不差。大概讲到了不同尺寸的模型，同个模型不同 effort 下的从原理和使用 case 上的区别。然后对于怎么选择给出了一些指导意见。

https://claude.dev/blog/spending-your-effort/?via=dailydev

第一篇文章首先讲到 claude code 支持在切换 effort 时，不会干扰 cache hit。这个其实说明一个问题：他说挺多用户喜欢这个，但实际上反馈的一个问题是，用户在使用他们的claude code时，切换effort的诉求还是挺多的。并且同时也有用户提出质疑吧，就是effort到底是个什么东西。

他自己通过专业的评测反馈的结果，以及自己做了一些测试，深入研究了一下effort是个什么东西。

他的宏观解释是：在high effort的时候，模型倾向于做更多验证、想到更多边界case，并进行测试。在一些领域，比如硬件测试、代码review，还有安全领域，这些领域模型表现得显著更好。

对于日常软件开发，他自己的习惯是使用low effort对作者本人自己进行访谈、实现，最后再用high effort进行review。

首先是对于 effort 是什么，作者说感性地对effort进行理解，就是你希望在这个任务上耗费多少计算资源。大多数时候，这关乎你怎么对这个任务的难度进行建模。举具体例子的话，就是人怎么响应老板的需求。假如老板让你做一个事情做12个小时，那你肯定会觉得老板让你把这件事情做得非常非常细。如果老板只让你做一个小时，那你其实会觉得，老板只是要给他一个初版，然后在此基础上再迭代。

> 实际上，我找到了几篇技术报告。其中一篇是GPTOSS model的训练报告，里面明确说low、medium和high三个raising level是分开训的。训练的时候，不同阶段模型的chain of thought是增加的。
>
> 我之前以为 effort 就是调整一下 thinking budget，调研了一下之后发现并不是。实际上，模型是在不同的训练语料下进行了训练，显著区分语料不同的点可能包括 chain of thought 长度情况，包括规划，agent 决策等等数据，然后最后在一个统一的模型里才能返回出这样的结果，也就是你可以选择的结果。从我的理解来说，effort 可能不仅影响你的 thinking budget 应该多长，还影响到agent在进行规划时应该怎么规划任务。比如low effort可能规划出来的任务是一个相对简单的执行过程；如果是high effort，它在规划时产出的结果就会比较复杂，即使没有thinking。

然后，从公开的 evals 结论角度看（文章引用的是 terminal bench 3.0），更高的 effort 反映出的就是更多的 tokens per attempt 以及更高的完成率

但是 evals 结果并不能直观的展示出在实际使用中有什么区别

文章里有这么一句话，我非常喜欢

> The best way to understand how models work is to run experiments. 

第一个例子是对于比较发散性的，确认的细节不多的构建任务，Underspecified build task，作者让不同 effort 强度的 claude 去构建，high effort 做出来的明显细节更多，功能更多。

然后是对于轻度，有一部分内容确定的任务，Lightly specified design task

这里他用的实际例子是，他相对 claude code 的 config 列表进行一次重新设计，用 low effort，claude 给了他一个操作，用 max effort，claude 给他了一个完整的 mockup 程序，并且还有一堆讲解入口，对于这个 case，他 prefer 用 low effort 去跟 claude 协作

然后是对于 Highly specified build task，他让 claude 对他进行了一个访谈，一起细化了一个 fitness app 的设计，然后给不同的模型不同的效果，最后发现实际产出的效果是差不多的，在他的实验中，一个有明显区别的地方时，max effort 做了一些细节上的简化。

这一段整体的 takeaways 是

怎么样选择 effort 取决于工作后给你想要什么，

其实它给每一个effort指明了应该什么时候做：
1. low effort：适合快速迭代之类的事情。
2. medium effort：适合大部分日常工作。
3. high effort：适合日常工作里带很多 edge case或verification的内容。
4. max：适合完全独立地让claude去找那些事情，自动化地完成很多事情、解决一个问题。

但我感觉，这对一个人该怎么选effort其实没有任何帮助。因为如果一个人自己很知道怎么对事情进行建模，那他其实早就会这样去试了。而那些又不懂这个东西，又自己不够勤奋，没有建模每一个自己遇到的问题的人，总是会偷懒去选最高级的。

https://platform.claude.com/docs/en/about-claude/models/choosing-a-model

https://academy.claude.com/tutorials/choosing-the-right-effort-level-in-claude-code

https://claude.com/resources/articles/claude-model-and-effort-level-in-claude-code
