# 领域文档

开始探索前，读取根目录的 `CONTEXT.md`，并在存在时读取 `docs/adr/` 下与当前工作相关的 ADR。缺少这些文件不阻塞工作。

## 布局

这是单上下文仓库：

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

使用 `CONTEXT.md` 定义的术语，并明确指出与现有 ADR 的冲突。
