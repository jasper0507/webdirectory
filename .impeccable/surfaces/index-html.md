---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# 首页

## Scope and mode

Visitor mode: Operate。Surface: 书签目录首页（`/` / `index.html`）。

## Audience and job

维护者（及只读访客）打开门户后要尽快找到并打开一个资源站。

## Task

浏览、搜索、按分类筛选，然后打开书签 URL。搜索覆盖名称、URL、描述和分类；搜索与分类组合过滤且同等重要。

## Constraints

- 规模上限约 2,000 条，用浏览器原生能力分批渲染
- 卡片固定显示名称和 URL；描述、分类为空时不渲染
- 两种主题共享同一 DOM、布局、信息层级和行为
- 分类可选；汇总与筛选忽略空值
- 覆盖加载失败、空目录、无搜索结果、长 URL、缺失描述/分类、移动端分类横向溢出、键盘焦点与 reduced-motion
- 不做：随机传送、独立明暗开关、多标签系统、首页编辑、图片生成

## Direction

Canon standing exit「标准书签目录」，种子 `80f28cbe`，code-first。
结构：页眉与统计 → 全宽搜索 → 横向分类 → 结果状态 → 卡片网格（桌面 4 / 平板 2 / 移动 1）。
克制主题：Claude 暖纸、墨色、少量陶土。
大胆主题：Neo-Brutalist 粗黑框、硬阴影、直角、高对比纯色。
Signature interaction：点击 Logo 切换并持久化主题。

## Memorable moment

Logo 一按，纸面目录变成施工标牌，条目一个不少、位置不变。
