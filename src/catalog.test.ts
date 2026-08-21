import { describe, expect, it, vi } from 'vitest'
import {
  filterEntries,
  loadBookmarkSource,
  normalizeCategory,
  normalizeTitle,
  parseBookmarkSource,
  standardizeUrl,
  type BookmarkEntry,
} from './catalog.ts'

const sample: BookmarkEntry[] = [
  {
    title: 'MDN',
    url: 'https://developer.mozilla.org/',
    displayUrl: 'developer.mozilla.org',
    category: '文档',
    description: 'Web 平台文档',
  },
  {
    title: 'Vite',
    url: 'https://vite.dev/',
    displayUrl: 'vite.dev',
    category: '工具',
    description: '前端构建工具',
  },
  {
    title: '没有分类的档案',
    url: 'https://archive.org/',
    displayUrl: 'archive.org',
    description: '互联网档案馆',
  },
  {
    title: '只有名字',
    url: 'https://example.com/plain',
    displayUrl: 'example.com/plain',
  },
]

describe('normalizeTitle', () => {
  it('去掉首尾空格并做 Unicode 标准化', () => {
    expect(normalizeTitle('  Café  ')).toBe('Café')
    expect(normalizeTitle('Cafe\u0301')).toBe('Café')
  })
})

describe('normalizeCategory', () => {
  it('空字符串和纯空白视为空值', () => {
    expect(normalizeCategory('')).toBeUndefined()
    expect(normalizeCategory('   ')).toBeUndefined()
  })

  it('保留大小写敏感的非空名称', () => {
    expect(normalizeCategory(' 文档 ')).toBe('文档')
    expect(normalizeCategory('Docs')).toBe('Docs')
    expect(normalizeCategory('docs')).toBe('docs')
  })
})

describe('standardizeUrl', () => {
  it('拒绝非 http(s) 地址', () => {
    expect(standardizeUrl('ftp://example.com/file')).toBeNull()
    expect(standardizeUrl('not a url')).toBeNull()
  })

  it('小写主机名、去掉默认端口和尾斜杠', () => {
    expect(standardizeUrl('HTTPS://Example.COM:443/path/')).toBe('https://example.com/path')
    expect(standardizeUrl('http://Example.com:80/')).toBe('http://example.com/')
  })

  it('去掉 hash，保留查询串', () => {
    expect(standardizeUrl('https://example.com/a?q=1#section')).toBe('https://example.com/a?q=1')
  })
})

describe('parseBookmarkSource', () => {
  it('接受顶层数组', () => {
    const parsed = parseBookmarkSource([
      { title: 'MDN', url: 'https://developer.mozilla.org/' },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries).toHaveLength(1)
    expect(parsed.catalog.entries[0]?.title).toBe('MDN')
  })

  it('接受 bookmarks 包装对象', () => {
    const parsed = parseBookmarkSource({
      bookmarks: [{ title: 'Vite', url: 'https://vite.dev/' }],
    })
    expect(parsed.ok).toBe(true)
  })

  it('根结构错误时失败', () => {
    const parsed = parseBookmarkSource({ items: [] })
    expect(parsed.ok).toBe(false)
  })

  it('跳过无效条目、空分类和空描述', () => {
    const parsed = parseBookmarkSource([
      { title: '  好的 ', url: 'https://ok.example/', category: '  ', description: '   ' },
      { title: '', url: 'https://bad.example/' },
      { url: 'https://missing-title.example/' },
      { title: '坏协议', url: 'javascript:alert(1)' },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries).toHaveLength(1)
    expect(parsed.catalog.entries[0]).toMatchObject({
      title: '好的',
      url: 'https://ok.example/',
    })
    expect(parsed.catalog.entries[0]?.category).toBeUndefined()
    expect(parsed.catalog.entries[0]?.description).toBeUndefined()
    expect(parsed.catalog.categories).toEqual([])
  })

  it('分类汇总忽略空值，并按首次出现顺序计数', () => {
    const parsed = parseBookmarkSource([
      { title: 'A', url: 'https://a.example/', category: '工具' },
      { title: 'B', url: 'https://b.example/' },
      { title: 'C', url: 'https://c.example/', category: '文档' },
      { title: 'D', url: 'https://d.example/', category: '工具' },
      { title: 'E', url: 'https://e.example/', category: '   ' },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries).toHaveLength(5)
    expect(parsed.catalog.categories).toEqual([
      { name: '工具', count: 2 },
      { name: '文档', count: 1 },
    ])
  })

  it('丢弃后出现的重复标题和标准化 URL', () => {
    const parsed = parseBookmarkSource([
      { title: 'GitHub', url: 'https://github.com/' },
      { title: 'GitHub', url: 'https://other.example/' },
      { title: 'GitHub 镜像', url: 'https://GitHub.com:443/' },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries.map((entry) => entry.title)).toEqual(['GitHub'])
  })
})

describe('filterEntries', () => {
  it('无查询且无分类时返回全部', () => {
    expect(filterEntries(sample, { query: '  ', category: null })).toHaveLength(4)
  })

  it('按分类精确过滤，不含空分类条目', () => {
    const found = filterEntries(sample, { query: '', category: '文档' })
    expect(found.map((entry) => entry.title)).toEqual(['MDN'])
  })

  it('空分类筛选值视为未筛选', () => {
    expect(filterEntries(sample, { query: '', category: '   ' })).toHaveLength(4)
  })

  it('搜索覆盖名称、URL、描述和分类', () => {
    expect(filterEntries(sample, { query: 'mozilla', category: null }).map((e) => e.title)).toEqual([
      'MDN',
    ])
    expect(filterEntries(sample, { query: '构建', category: null }).map((e) => e.title)).toEqual([
      'Vite',
    ])
    expect(filterEntries(sample, { query: '工具', category: null }).map((e) => e.title)).toEqual([
      'Vite',
    ])
    expect(filterEntries(sample, { query: '档案', category: null }).map((e) => e.title)).toEqual([
      '没有分类的档案',
    ])
  })

  it('搜索与分类同时生效', () => {
    expect(filterEntries(sample, { query: '文档', category: '工具' })).toEqual([])
    expect(filterEntries(sample, { query: 'vite', category: '工具' }).map((e) => e.title)).toEqual([
      'Vite',
    ])
  })

  it('多个词必须全部命中', () => {
    expect(filterEntries(sample, { query: 'web 文档', category: null }).map((e) => e.title)).toEqual([
      'MDN',
    ])
    expect(filterEntries(sample, { query: 'web 构建', category: null })).toEqual([])
  })
})

describe('loadBookmarkSource', () => {
  it('网络失败时返回 load-failed', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    const result = await loadBookmarkSource('/bookmarks.json', fetchImpl)
    expect(result.status).toBe('load-failed')
  })

  it('HTTP 错误时返回 load-failed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }))
    const result = await loadBookmarkSource('/bookmarks.json', fetchImpl)
    expect(result.status).toBe('load-failed')
  })

  it('非法 JSON 时返回 invalid-source', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('not-json', { status: 200 }))
    const result = await loadBookmarkSource('/bookmarks.json', fetchImpl)
    expect(result.status).toBe('invalid-source')
  })

  it('合法数组时返回目录', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ title: 'MDN', url: 'https://developer.mozilla.org/' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await loadBookmarkSource('/bookmarks.json', fetchImpl)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.catalog.entries).toHaveLength(1)
  })
})
