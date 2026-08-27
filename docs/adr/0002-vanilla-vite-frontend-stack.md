# 采用 Vite 原生 TypeScript 前端栈

> Status: superseded by ADR-0005（去掉 daisyUI，改用本项目组件；Vite + 原生 TypeScript、不引入 React/Vue 仍然成立）

前端固定使用 Vite、原生 TypeScript、Tailwind CSS v4、daisyUI 5 与 Lucide，不引入 React 或 Vue。对当前单页静态目录而言，原生 DOM 能力足以承载交互；保留这组样式与图标工具，是为了让 AI 编写时保持一致、代码干净且便于维护，而不是为未出现的复杂状态提前引入 UI 框架。
