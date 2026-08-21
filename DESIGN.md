---
name: 目录
description: 同一套骨架上的克制纸面与大胆标牌
colors:
  paper: "#f8f8f6"
  sheet: "#ffffff"
  ink: "#121212"
  ink-soft: "#373734"
  ink-mute: "#5c5b56"
  chalk: "#e7e6e1"
  clay: "#d97757"
  selection: "#ead7cf"
  lime: "#ccff00"
  magenta: "#ff006e"
  ink-bold: "#000000"
  ink-mute-bold: "#1a1a1a"
typography:
  display:
    fontFamily: "Source Serif 4, Noto Serif SC Subset, Songti SC, serif"
    fontSize: "1.85rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Source Serif 4, Noto Serif SC Subset, Songti SC, serif"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Source Sans 3, Source Han Sans SC, Noto Sans SC, ui-sans-serif, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Source Sans 3, Source Han Sans SC, Noto Sans SC, ui-sans-serif, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  display-bold:
    fontFamily: "Archivo Black, Noto Sans SC Black Subset, Noto Sans SC, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body-bold:
    fontFamily: "Spline Sans Mono, ui-monospace, Noto Sans SC, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  none: "0"
  control: "8px"
  card: "16px"
  dot: "2px"
spacing:
  chip-gap: "8px"
  grid: "16px"
  grid-bold: "18px"
  page-inline: "16px"
  masthead: "28px"
  card: "18px 19px 18px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "7px 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 13px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "7px 13px"
  chip-selected-bold:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.ink-bold}"
    rounded: "{rounded.none}"
    padding: "7px 13px"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px 19px 18px"
  input-search:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 16px 0 43px"
---

# Design System: 目录

## Overview

**Creative North Star: "两套纸面"**

目录是一张检索工具，不是导航站橱窗。同一套 DOM、同一阅读顺序、同一信息层级，只换纸：克制是骨纸上的墨与陶土点，大胆是柠绿底上的直角粗框。主题切换发生在 Logo 上，位置一个都不动。

视觉个性来自材质反差，不来自额外模块。克制说话靠字重与留白；大胆说话靠边框、硬阴影和纯色。两套纸面共用卡片网格、搜索与分类芯片，禁止为其中一套另起布局。

**Key Characteristics:**

- 同一骨架，两套纸面；`data-theme` 只换 token，不换结构
- 克制：骨纸、碳墨、陶土点缀、8px/16px 圆角、发丝边
- 大胆：柠绿底、纯黑粗框、品红点、直角、硬偏移阴影
- Logo 是唯一主题开关，没有独立明暗控件
- 卡片只保证名称和 URL；空描述、空分类不占位

## Colors

克制是暖单色加一枚陶土；大胆是柠绿场加品红强调。两者都是浅色 `color-scheme: light`，不靠系统暗色反相。

### Primary
- **Carbon Ink** (`#121212`): 克制主题的正文、标题、选中芯片与主按钮。
- **Ink Bold** (`#000000`): 大胆主题的正文、边框与硬阴影。

### Secondary
- **Magenta** (`#ff006e`): 大胆主题的选中芯片、Logo 色块、卡片悬停阴影。不用于克制主题的按钮填充。
- **Clay** (`#d97757`): 克制主题唯一彩色，只用在 Logo 色点与状态图标，不填充按钮或链接。

### Tertiary
- **Lime** (`#ccff00`): 大胆主题的页面画布，也用作卡片内分类徽标底。

### Neutral
- **Bone Parchment** (`#f8f8f6`): 克制页面画布。
- **Sheet** (`#ffffff`): 两套主题的卡片、搜索框、未选中芯片。
- **Graphite** (`#373734`): 克制次级正文。
- **Ink Mute** (`#5c5b56`): 克制 URL、副标题、结果句、芯片计数；对比度约 6.4:1。
- **Chalk** (`#e7e6e1`): 克制发丝边。
- **Selection** (`#ead7cf`): 克制文本选区。

### Named Rules
**The Clay-is-a-Mark Rule.** 克制主题里陶土只做 12px 级色点或图标描边，不填按钮、不画链接、不铺色条。

**The Shared-Skeleton Rule.** 颜色全部走 CSS 变量。禁止为某一主题复制一套组件 DOM。

## Typography

**Display Font:** Source Serif 4 + Noto Serif SC Subset（克制）；Archivo Black + Noto Sans SC Black Subset（大胆）
**Body Font:** Source Sans 3（克制）；Spline Sans Mono（大胆）
**Label/Mono Font:** 克制沿用 Sans；大胆沿用 Mono。URL 在克制中仍是 Sans，因为它是必显字段而不是代码妆。

**Character:** 克制用衬线字标压住目录身份，正文保持工作界面的无衬线；大胆把标题压成粗黑，正文改成等宽，像施工标牌。中文走自托管子集，不把字标交给系统黑体。

### Hierarchy
- **Display** (400, 1.85rem, 1.1): Logo 字标「目录」。
- **Headline** (400, 1.5rem, 1.2): 空态与错误标题。
- **Title** (400, 1.12rem, 1.25): 书签卡片名称。
- **Body** (400, 15px / 0.9rem, 1.5): 页面与描述。
- **Label** (400, 0.88–0.82rem): 芯片、结果句、副标题、URL（0.8rem）。

### Named Rules
**The No-Costume-Mono Rule.** 克制主题不为了“像开发者工具”把 URL 改成等宽；大胆主题的等宽是整页正文，不是局部装饰。

## Layout

页面最大宽度 72rem，左右各留至少 1rem。阅读顺序固定：页眉（Logo / 统计）→ 全宽搜索 → 横向分类 → 结果句 → 卡片网格。

网格：移动 1 列，`768px` 起 2 列，`1024px` 起 4 列。卡片间距克制 1rem、大胆 1.15rem。`639px` 以下页眉改为纵向：字标在上，统计在下。分类芯片单行横滑；溢出时右缘淡出，提示还有后续。

**The First-Viewport-is-the-Index Rule.** 首屏必须同时给出搜索、分类和至少一行结果，不把检索控件藏进英雄区或抽屉。

## Elevation & Depth

克制用色阶分层：骨纸上的白卡片，静止时只有 1px 发丝描边（`0 0 0 1px #e7e6e1`），悬停才出现软阴影。大胆用硬偏移阴影当结构，不允许模糊阴影。

### Shadow Vocabulary
- **Restrained hairline** (`0 0 0 1px #e7e6e1`): 卡片静止。
- **Restrained hover** (`0 4px 20px rgb(18 18 18 / 0.08)`): 卡片悬停。
- **Bold card** (`6px 6px 0 #000000`): 卡片、搜索框静止。
- **Bold hover** (`10px 10px 0 #ff006e`): 卡片悬停，阴影改品红。
- **Bold chip/mark** (`3px 3px 0 #000000`): Logo 色块与芯片。

### Named Rules
**The Hard-Shadow-Belongs-to-Bold Rule.** `Npx Npx 0 #000` 只属于大胆主题。克制主题禁止硬偏移阴影。

## Shapes

克制：控件 8px，卡片 16px，Logo 色点 2px。大胆：全部直角，`border-radius: 0`，边框 3px 纯黑。克制卡片本身 `border-color: transparent`，轮廓交给发丝阴影，避免和圆角描边打架。

## Components

### Buttons
- **Shape:** 跟随 `--radius-control`（克制 8px，大胆 0）。
- **Primary:** 墨底纸字，`7px 16px`，用于错误重试与清除筛选。
- **Hover / Focus:** 大胆主题悬停向左上挪 2px 并加大阴影；按下位移等于阴影并取消阴影。焦点环 2px `var(--focus-ring)`，offset 3px。Logo 按钮无填充，只换纸面。

### Chips
- **Style:** 白底，克制发丝边，大胆黑框加硬阴影。
- **State:** 未选中为纸面；克制选中为碳墨底骨纸字；大胆选中为品红底黑字。原生 radio 承担键盘方向键。

### Cards / Containers
- **Corner Style:** 克制 16px，大胆直角。
- **Background:** 白卡片落在骨纸或柠绿上。
- **Shadow Strategy:** 见 Elevation。
- **Border:** 克制透明 + 发丝阴影；大胆 3px 黑。
- **Internal Padding:** 约 18px。
- **Content:** 名称与 URL 必显；描述、分类为空则不渲染节点。长 URL 任意位置折行。

### Inputs / Fields
- **Style:** 全宽搜索，白底，高 50–54px，左侧 Lucide 放大镜。
- **Focus:** 全局 `:focus-visible` 墨色/黑色 2px 环。
- **Placeholder:** `ink-mute`，不降低透明度。

### Navigation
没有站点级导航。页眉左侧 Logo 即主题开关；分类芯片即筛选。移动端芯片溢出时用 mask 淡出，而不是折行。

### Logo Mark
2.35rem 方块 + 0.72rem 色点。克制陶土点，大胆品红点。点击在 `restrained` / `bold` 之间切换并写入 `localStorage` 键 `portal-theme`。

## Do's and Don'ts

### Do:
- **Do** 用同一套 DOM 切换主题，只改 CSS 变量。
- **Do** 把 Logo 当作唯一主题开关，并持久化。
- **Do** 让卡片始终显示名称和 URL；空字段直接不画。
- **Do** 在分类溢出时保留横滑，并用右缘淡出提示后续芯片。
- **Do** 把陶土和品红当作色点或大胆强调，而不是克制主题的按钮色。

### Don't:
- **Don't** 加随机传送、独立明暗开关、多标签或首页编辑。
- **Don't** 给卡片加彩色顶边或侧边色条。
- **Don't** 在克制主题使用硬偏移阴影或直角粗框。
- **Don't** 在大胆主题使用圆角、模糊阴影或灰色边框。
- **Don't** 把系统黑体当作中文展示字体；字标与卡片标题走自托管子集。
