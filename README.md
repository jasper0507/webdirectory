# 七卷拾光

用户维护的公开书签目录。打开先进入**搜索厅**：两字碑、一根提问线、最多七个常用标签。提问或点标签之后，**货架**用卡片列出站点。

这不是通用导航站，也没有账号、数据库或后台编辑。收藏和厅面文案都写在仓库里的一份 JSON 里，推送后发布。

线上站点：[portal.jasper0507.me](https://portal.jasper0507.me)

## 预览

搜索厅（白日纸）。空厅是一屏题签，卡片不会出现在这里。

![搜索厅 · 白日纸](docs/preview/hall-day.png)

键入提问后，厅内出现题名索引：匹配标签最多三条，题名补齐到约七行。七词在提问时收起。

![搜索厅 · 提问索引](docs/preview/hall-search.png)

同一张纸翻到夜里。页脚切换，选择会记在浏览器里。

![搜索厅 · 夜间纸](docs/preview/hall-night.png)

货架。无提问也无标签时展示全部目录；有提问或标签时只展示命中。点卡片打开外链。

![货架 · 白日纸](docs/preview/shelf-day.png)

## 特点

- **厅是入口，架是目录。** 默认 `/` 是搜索厅；`/shelf` 才是卡片网格。Logo 始终回到搜索厅。
- **提问和标签两路、互斥。** 框里提交只按提问词全站重搜；点任何标签（七词、建议、结果顶、卡片上的标签）进入该类并清空提问。
- **建议启动、回车搜索。** 点建议或方向键选亮后再回车，才会打开站点或进入该类。未选亮时回车或点放大镜一律按提问词进货架，唯一命中也不会直接打开。空提交看全部货架。
- **模糊匹配，不搜网址。** 提问词用 Fuse.js 在标题、描述、标签上整句模糊匹配，按分数排序，不匹配 URL。
- **七词跟着收藏走。** 搜索厅底部最多七个快捷标签，按被条目引用的次数降序；不够七个就有几个显示几个，不会为凑满而编造。
- **一份 JSON 就是全部内容。** 书签可用终端命令快速收录，也可直接编辑 `public/portal.json`；页面上没有添加面板或编辑模式。
- **白日纸 / 夜间纸。** 同一套 DOM，用 `data-paper` 换色板。夜间开关在页脚。
- **没有后端。** 浏览器直接拉取静态 `portal.json`，构建结果可以放到任何静态托管上。

## 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 构建 | [Vite](https://vite.dev/) 8 | 开发服务器与静态打包 |
| 语言 | TypeScript | 原生 DOM，不使用 React / Vue |
| 搜索 | [Fuse.js](https://www.fusejs.io/) | 标题、描述、标签的模糊匹配 |
| 界面 | 本项目 CSS | Archive Paper：浅档案纸、金线、衬线碑题 |
| 测试 | Vitest | `src/**/*.test.ts`、`scripts/**/*.test.mjs` |
| 发布 | Vercel | 跟 `main` 构建；`vercel.json` 把 `/shelf` 回退到 `index.html` |

运行时依赖只有 Fuse.js。没有 UI 框架、没有组件库、没有数据库。

## 项目结构

```text
webdirectory/
├── scripts/
│   └── add-bookmark.mjs     交互式收录书签
├── public/
│   ├── portal.json          门户源：站点身份 + 书签目录
│   ├── favicon.svg          白日图标（与圆印同一构图）
│   ├── favicon-night.svg    夜间图标
│   └── fonts/               Linux 兜底字体
├── src/
│   ├── main.ts              入口：挂样式并启动
│   ├── app.ts               厅 / 架切换、键盘、提交规则
│   ├── capture.ts           收录候选生成与全量校验
│   ├── catalog.ts           解析门户源、搜索、七词
│   ├── routes.ts            `/` 与 `/shelf?q=&tag=`
│   ├── theme.ts             白日 / 夜间纸
│   ├── ui.ts                题名索引、七词、卡片分批上屏
│   ├── styles.css           Archive Paper
│   └── *.test.ts
├── index.html               厅、架两套页面骨架
├── vite.config.ts
└── vercel.json              `/shelf` 回退到首页
```

书签收录命令与手工编辑最终都只改 `public/portal.json`。搜索厅和货架的零件在 `src/ui.ts`，不要另起一套 class。

## 用户快速上手

只想本地预览可以直接克隆本仓库；要维护并发布自己的门户，先 Fork，再把下面的仓库地址换成自己的 Fork。

### 环境

- Node.js **20.19+** 或 **22.12+**（Vite 8 的要求）
- npm（仓库带 `package-lock.json`）

### 1. 获取项目

```bash
git clone https://github.com/jasper0507/webdirectory.git
cd webdirectory
npm install
```

### 2. 设置站点身份

首次使用时，编辑 `public/portal.json` 的 `identity`。它控制字标、碑题、耳语和页脚文案；字段规则见下方[维护门户源](#维护门户源)。

### 3. 收录书签

```bash
npm run bookmark:add
```

命令依次询问 URL、标题、已有或新标签以及可选描述，可以连续收录多条。全部条目通过校验并经确认后，才会更新 `public/portal.json`；提交与推送仍由用户决定。

### 4. 本地查看

```bash
npm run dev
```

终端里会出现本地地址，默认是 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。用浏览器打开即可。

### 5. 验证并发布

```bash
npm run build
git diff -- public/portal.json
git add public/portal.json
git commit -m "data: 更新书签目录"
git push origin main
```

`npm run build` 会依次运行测试、类型检查和生产构建。配置好 Vercel 后，推送 `main` 即会发布；其他平台见下方[部署方式](#部署方式)。

## 浏览和搜索

1. 打开后是搜索厅。空厅不自动聚焦提问框，避免一进来就挡住碑题。
2. 按 `/`，或点提问线，开始输入。输入时下方出现题名索引，七词收起。
3. 用方向键选亮一项再回车：选中站点会新标签打开，选中标签会进入该类货架。
4. 不选任何建议、直接回车或点放大镜：按当前提问词去货架搜索。厅里搜不到时会提示「没有这道题」，回车仍把提问带到货架空态，不会偷偷改成全部目录。
5. 提问框留空再提交，进入全部货架。
6. 点底部七词、货架结果顶的标签、或卡片上的标签，都是「只看这一类」，提问会被清空。
7. 点左上角字标回到搜索厅。页脚「夜间 / 白日」切换纸色，选择保存在本机。

货架上可以继续提问，规则与厅相同：打字出建议，卡片不会边打边变；回车才全站重搜。

```bash
npm test          # 只跑测试
npm run typecheck # 只做类型检查
npm run preview   # 预览 dist/ 中的生产包
```

## 部署方式

站点是纯静态前端。浏览器运行时请求 `/portal.json`，没有服务端接口，也不需要环境变量。

### Vercel（当前用法）

推送到 GitHub `main` 后由 Vercel 自动构建，发布到 `portal.jasper0507.me`。

仓库根目录的 `vercel.json` 已经写好 SPA 回退：直接访问 `/shelf` 或 `/shelf/` 会落到 `index.html`，再由前端读 `?q=` / `?tag=` 画出货架。厅里点进货架走的是 `history.pushState`，不依赖这次回退；回退是给刷新和外链用的。

在 Vercel 上新建项目时：

1. Import 这个 GitHub 仓库。
2. 框架预设用 Vite；构建命令 `npm run build`，输出目录 `dist`。
3. 绑定自定义域名（可选）。

改书签：运行 `npm run bookmark:add` 或编辑 `public/portal.json` → 提交并推送 `main` → 等构建完成。

### 其他静态托管

```bash
npm run build
```

把 `dist/` 整目录上传到 Cloudflare Pages、Netlify、对象存储静态网站等。需要保证：

- `index.html`、`/portal.json`、`/assets/*`、`/fonts/*`、favicon 都能按路径访问。
- **`/shelf` 刷新不能 404。** 把 `/shelf` 和 `/shelf/*` 回退到 `index.html`（各平台名称不同：Rewrites、Redirects、SPA fallback）。

GitHub Pages 对 History 路由不友好，需要额外的 404 回退技巧，不作为首选。

### 本机预览生产包

```bash
npm run build
npm run preview
```

`vite preview` 可以打开打包后的站点，适合在推送前确认。它不是生产服务器。

## 维护门户源

权威文件只有 `public/portal.json`。结构如下：

```json
{
  "identity": {
    "wordmark": "七卷拾光",
    "monument": ["拾", "光"],
    "eyebrow": "BIBLIOTHECA",
    "stampEn": "SEVEN SHELVES",
    "convergence": "七卷同归",
    "whisper": ["在七座私人书架之间，键入一个名字，", "让收藏顺流而下。"],
    "placeholder": "键入书签或站点...",
    "colophonLeft": "SHELVED FROM SEVEN ARCHIVES",
    "colophonRight": "SEVEN SHELVES · ONE STREAM"
  },
  "bookmarks": [
    {
      "title": "MDN Web Docs",
      "url": "https://developer.mozilla.org/",
      "tags": ["文档"],
      "description": "可选，可省略。"
    }
  ]
}
```

规则（解析时会规范化可修正的文本；任一无效或重复条目都会让整份门户源失败）：

- `identity` 中的所有字段都必填；`monument` 必须恰好包含两个汉字，`whisper` 必须恰好包含两行。
- 每条书签必须有 `title`、`http(s)` 的 `url`、至少一个标签。
- 标题去重（去首尾空格 + Unicode NFC，大小写敏感）；URL 按标准化去重（小写主机名、去掉默认端口和尾斜杠、去掉 hash）。
- 标签完全平级，数组位置不表达优先级；无约束货架保持门户源顺序。
- 只接受示例中的 canonical 字段；`category` 等旧字段或未知字段会被拒绝。
- 七词不必写入身份；运行时按标签引用次数生成。
