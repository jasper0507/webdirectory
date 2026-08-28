# 提问词按线上站规则做模糊匹配

提问词与标签约束仍是两路（见 0006）。提问词对齐 `webdirectory.vercel.app`：用 Fuse.js 在名称、描述、标签上整句模糊匹配（threshold 0.4），按分数排序；不搜 URL。不把提问词按空白切成 AND 子串。精确标签约束仍在 Fuse 之后做交集。
