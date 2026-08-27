# 门户源

改书签或厅面文案时，只编辑 `public/portal.json`，不要改页面 DOM 来增删条目。

## 结构

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

## 规则

- `monument` 必须是恰好两个汉字。
- `whisper` 必须是两行。
- 每条书签必须有 `title`、`url`、至少一个标签。
- 标题去重（trim + NFC，大小写敏感）；URL 按标准化去重。
- 不要写 `category`。旧分类应写成 `tags` 里的一项。
- 七词不必写入身份；运行时按标签引用次数生成。
