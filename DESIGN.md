---
name: 七卷拾光
description: Archive Paper 的书签厅。
colors:
  paper: "#eef0f2"
  paper-night: "#1c1e22"
  paper-soft: "#f6f7f9"
  paper-soft-night: "#24262b"
  cream: "#1f2328"
  cream-night: "#eef0f2"
  ash: "#5d646d"
  ash-night: "#9aa0a8"
  ash-deep: "#646b74"
  ash-deep-night: "#8a9099"
  gold: "#a87b3f"
  gold-soft: "#c99a5b"
  gold-dim: "#b08a52"
  sheet: "#f6f7f9"
  sheet-night: "#24262b"
  card-line: "#d8dbe0"
  card-line-night: "#3a3d44"
typography:
  display:
    fontFamily: "Songti SC, STSong, SimSun, Noto Serif SC, Archive Serif Fallback, Georgia, Times New Roman, serif"
    fontSize: "7.5rem"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "normal"
  title:
    fontFamily: "Songti SC, STSong, SimSun, Noto Serif SC, Archive Serif Fallback, Georgia, Times New Roman, serif"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "PingFang SC, Hiragino Sans GB, Helvetica Neue, Archive Sans Fallback, Noto Sans CJK SC, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "PingFang SC, Hiragino Sans GB, Helvetica Neue, Archive Sans Fallback, Noto Sans CJK SC, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "0.25em"
rounded:
  none: "0px"
  hairline: "2px"
  kbd: "4px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "0.35rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2.5rem"
components:
  brand:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.title}"
    rounded: "{rounded.circle}"
    padding: "0"
  input-search:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 0 8px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ash}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
  constraint-chip:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
  hall-item:
    backgroundColor: "transparent"
    textColor: "{colors.ash}"
    padding: "0.35rem 0"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.cream}"
    rounded: "{rounded.hairline}"
    padding: "1.1rem 1.15rem"
  paper-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ash}"
    typography: "{typography.label}"
    padding: "0"
  text-action:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    padding: "0"
---

# Design System: 七卷拾光

Archive Paper 的书签厅。搜索厅是一屏题签；货架是二级厅，允许安静的卡片。第一版只有克制纸，含夜间色板。

## Overview

**Creative North Star: "浅档案纸 + 一座两字碑 + 一根金线提问。"**

默认界面是搜索厅。货架共用纸、墨、金，但不复制碑。Logo 回到搜索厅。夜间是同一张纸翻到夜里，不是另一套布局。

**Key Characteristics:**

- 搜索厅是一屏题签；卡片只出现在货架。
- 白日与夜间是同一张纸；`data-paper` 换色板，不换 DOM。
- 金是唯一强调，不许改金，也不许把金改成漆。
- 衬线只给字标、碑题、提问线和卡片标题。
- Logo 回厅；夜间开关只在页脚。

## Colors

不许改金。产品可以换文案，不能换纸。

| Token | Day | Night |
| --- | --- | --- |
| paper (`--color-ink`) | `#eef0f2` | `#1c1e22` |
| paper-soft | `#f6f7f9` | `#24262b` |
| cream / 墨 | `#1f2328` | `#eef0f2` |
| ash | `#5d646d` | `#9aa0a8` |
| ash-deep | `#646b74` | `#8a9099` |
| gold | `#a87b3f` | `#a87b3f` |
| gold-soft | `#c99a5b` | `#c99a5b` |
| gold-dim | `#b08a52` | `#b08a52` |

夜间禁止纯黑、禁止霓虹、禁止把金改成漆。选区仍是金尘底。`theme-color` 跟随纸色。货架卡片用 `--color-sheet` 落在纸上，发丝边 `--card-line`。

**The Gold is Law Rule.** 金是唯一强调色。产品可以换文案，不能换纸，也不能改金。金只作线、点、环；正文、选中题名、检索图标用墨，圆印角标用墨，不许第二强调色。

**The Same-Paper Rule.** 用 `data-paper="day|night"` 换色板，不换 DOM。夜间仍是这张纸，不是另一套主题。

## Typography

**Display Font:** Songti SC（Linux 兜底 `Archive Serif Fallback`，不要把 Songti SC 指到 Noto）
**Body Font:** PingFang SC（兜底 `Archive Sans Fallback`）

**Character:** 碑是薄衬线，不是粗黑标题。正文与元数据走无衬线，让碑和提问线成为唯一的笔触。

- 衬线只给字标、碑题、提问框、货架卡片标题。
- 其余 sans。碑题字重 400，禁止 bold。
- Linux 兜底字体家族名为 `Archive Serif Fallback` / `Archive Sans Fallback`，不要把 `Songti SC` 指到 Noto。

### Hierarchy

- **Display** (400, 移动 13vw / 桌面 7.5rem, 行高 0.95)：两字碑。
- **Title** (400, 1.12rem, 行高 1.25)：货架卡片标题；字标 1rem、字距 0.35em。
- **Body** (400, 16px)：页面默认；耳语 13px、字距 0.18em。
- **Label** (400, 9–11px, 字距 0.15–0.5em)：印戳、七词、键位、页脚、结果句。

**The Sparse Serif Rule.** 衬线是碑、提问和题名的笔，不是整页装饰。碑题禁止 bold。

## Search hall

阅读顺序：页头（圆印 + 字标 / 金点 + 印戳）→ 眉题 → 两字碑 → 两行耳语 → 提问线 → 键位提示 → 题名索引（输入后）→ 七词 → 页脚。提问时厅加上 `is-asking`：眉题、耳语和提示收起，七词收起，碑收到一行字标尺度，上内边距收到区块尺度，把视口让给索引。短视口空厅可藏眉题，碑仍在。

- 空厅桌面一屏题签。厅内不为卡片网格纵滚。索引最多约七行，无卡片、无阴影。
- 指针精细时提示是 `/` 与 `↵` 键位；触控或窄屏改为一句中文（空提交看全部货架），不把整组提示藏掉。
- 提问是底边线，不是输入盒。空厅不自动聚焦；`/`、「跳到提问」或点提问线才聚焦，金线此时从左生长。
- 七词按标签引用次数动态取最多七个；无填充、无描边。有提问时整组收起。
- 提问词在名称、描述、标签上整句模糊匹配，不搜 URL；点选标签仍是精确约束。
- `/` 聚焦提问；Logo 回厅清空提问、收起索引、不保留焦点。Escape 先取消选中，再清空提问。选中题名，或无选中且唯一题名时，回车打开 URL。选中标签、点七词，或提问词与某条匹配标签同名，则带该标签进货架。空提交、多条命中未选中，仍进货架。选中行左侧金点，题名保持墨或灰，不整行改成金字。提示写「↵ 打开高亮项，或进入货架」。
- 空提交进入全部货架，不再只闪金线。厅内无匹配时索引位留一句「没有这道题。回车看全部货架。」；回车清空提问约束，进入无约束货架。

## Shelf

同一套货架。无约束 = 全部目录，按条目的首个标签分块；有提问词或标签约束 = 命中集合（单块网格）。

- 顶栏：Logo 回厅、约束条（提问词与已选标签可叉）、当前命中条数。顶栏、提问行与约束条叠成一块吸顶，改提问不必先滚回页头。
- 提问行与厅共用通栏底边和圆钮，聚焦时底边改金；不使用生长金线。
- 卡片：白纸面落在档案纸上。名称与 URL 必显；空描述不占位。点卡片打开外链。点卡片上的标签 = 追加精确约束。标签字级保持印戳，未约束时待命短金线，热区外扩到 44px，不靠 `min-height: 44px` 把卡片撑高。约 2000 条时卡片分批上屏。
- 网格：移动 1 列，`768px` 起 2 列，`1024px` 起 3 列。卡片圆角不超过 2px，发丝边，无硬偏移阴影、无彩条。少命中时卡片按内容高度，不把网格撑满视口；页脚仍沉底。

## Motion

`--ease-royal: cubic-bezier(.22, 1, .36, 1)`。碑题 `revealUp` 1.1s。禁止 bounce。`prefers-reduced-motion` 时停掉星尘、轨道、揭示和装饰过渡；焦点金线仍以终态出现。

## Layout

厅是一列居中的题签：页头 sticky，主列把碑送到视口中部（移动上内边距 5.5rem，`48rem` 起 14.3125rem）。提问态或视口高度低于 `48rem`（含手机横屏）时收上内边距；提问态碑收到字标级。厅内不为卡片网格纵滚。货架容器 `min(72rem, calc(100% - 2rem))`；网格移动 1 列，`768px` 起 2 列，`1024px` 起 3 列，间隙 1rem。页头/货架顶栏水平内边距 1.25rem，`48rem` 起 3.5rem，并吃进 `safe-area-inset`。节奏只用少数档：控件间隙 0.35–0.75rem，区块 1.25–2.5rem。

## Elevation & Depth

深度靠纸面分层，不靠投影。档案纸是场地；卡片是落在纸上的一张更白（夜间更深）的 sheet，发丝边勾边。品牌圆印用 1px 金环，不是投影。搜索提交钮悬停时才出现金尘光晕，不推广到卡片或厅面列表。

**The Hairline-Not-Shadow Rule.** 卡片禁止硬偏移阴影。轮廓用发丝边；悬停改边为金，不抬起。

## Shapes

直角是默认。卡片圆角不超过 2px。提问是一条底边，半径 0。提交钮与品牌印是正圆。七词和约束看起来像胶囊热区，但没有填充和描边。

## Components

零件都是纸上的墨，不是套件里的控件。没有填充主按钮，没有带阴影的输入盒。

### Brand

圆印 + 衬线字标。点击回到搜索厅，不切换主题。印 1.75rem，档案纸底、墨角标、金环描边。悬停印放大到 1.05。白日夜间同一构图，填色跟随 `data-paper`。

### Search line

底边 1px 发丝，serif 18px / 28px。厅内聚焦时 2px 金线从左生长（0.6s ease-royal）。货架同一行、通栏，聚焦把底边加到 2px 金。键盘焦点靠这条金线，不画输入盒；`forced-colors` 才出系统高亮框。提交钮是 2.75rem 金描边圆，检索图标用墨。

### Seven-word chips

无填充、无描边。11px，字距 0.15em。悬停变金，底边金线从左生长。无悬停设备上金线以短线待命，按下才长满。

### Hall index

输入后出现。匹配标签最多 3 条，题名补齐到共约 7 行。无卡片、无阴影。悬停底边金线，选中左侧金点；题名保持灰或墨，不整行改成金字。无匹配时留一句「没有这道题。回车看全部货架。」有提问时七词收起。

### Constraint chips

提问词与已选标签，行首印「已约束」。移除标记是金线叉，标签保持墨色；整粒芯片可点，读屏名为「移除提问 … / 移除标签 …」。

### Bookmark cards

`--color-sheet` 落在档案纸上。圆角 2px，发丝边。悬停边改金。名称 serif；空描述不占位。卡片上的标签在链接外，追加精确约束；悬停金线，读屏名为「用标签 … 约束货架」。已约束的标签按下态金线、`aria-pressed`，不可再点。卡片主链接读屏名为「打开 …（新标签页）」。

### Paper toggle

页脚文字钮，11px、字距 0.16em。白日灰墨，夜间用墨，与题签分开。悬停/焦点仍用墨，底边金线。不放在 Logo 上。

### Text action

加载失败重试与清除约束：无底无边，12px 墨字，悬停/焦点底边金线。金不作正文。门户源失败不复用货架提问行和条数，主列只留原因和重试。

## Do's and Don'ts

### Do:

- **Do** 用 `data-paper="day|night"` 换色板，不换 DOM。
- **Do** 把 Logo 当回厅，夜间开关放页脚。
- **Do** 让卡片只出现在货架。

### Don't:

- **Don't** 在搜索厅放货架、胶囊、阴影搜索盒。
- **Don't** 做大胆/柠绿主题（第一版）。
- **Don't** 用 Logo 切换主题。
- **Don't** 把系统黑体当碑题。
- **Don't** 为凑满七个快捷词编造标签。
