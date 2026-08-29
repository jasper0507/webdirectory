import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  loadPortalSource,
  parsePortalSource,
  parseShelfQuery,
  queryIsEmpty,
  searchEntries,
  sevenWords,
  summarizeEntryTags,
  type BookmarkEntry,
} from './catalog.ts'

const identity = {
  wordmark: '试厅',
  monument: ['甲', '乙'],
  eyebrow: 'BIBLIOTHECA',
  stampEn: 'SEVEN SHELVES',
  convergence: '七卷同归',
  whisper: ['第一行', '第二行'],
  placeholder: '键入书签或站点...',
  colophonLeft: 'LEFT',
  colophonRight: 'RIGHT',
}

function portalSource(bookmarks: unknown[], siteIdentity: unknown = identity): string {
  return JSON.stringify({ identity: siteIdentity, bookmarks })
}

const sample: BookmarkEntry[] = [
  {
    title: 'GORM 文档',
    url: 'https://gorm.io/',
    displayUrl: 'gorm.io',
    tags: ['go', 'gorm', 'orm'],
    description: 'Go 的 ORM',
  },
  {
    title: 'Vite',
    url: 'https://vite.dev/',
    displayUrl: 'vite.dev',
    tags: ['工具'],
    description: '前端构建工具',
  },
  {
    title: 'MDN',
    url: 'https://developer.mozilla.org/',
    displayUrl: 'developer.mozilla.org',
    tags: ['文档'],
    description: 'Web 平台文档',
  },
]

describe('parsePortalSource', () => {
  it('通过 interface 规范化身份和书签', () => {
    const parsed = parsePortalSource(
      portalSource(
        [
          {
            title: '  Cafe\u0301  ',
            url: 'HTTPS://Example.COM:443/path/#section',
            tags: [' 文档 ', '文档'],
            description: '  示例说明  ',
          },
        ],
        { ...identity, wordmark: '  试厅  ' },
      ),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.identity.wordmark).toBe('试厅')
    expect(parsed.catalog.identity.monument).toEqual(['甲', '乙'])
    expect(parsed.catalog.entries[0]).toEqual({
      title: 'Café',
      url: 'https://example.com/path',
      displayUrl: 'example.com/path',
      tags: ['文档'],
      description: '示例说明',
    })
    expect(parsed.catalog.tags).toEqual([{ name: '文档', count: 1 }])
  })

  it.each([
    ['根数组', JSON.stringify([{ title: '旧', url: 'https://old.example/', tags: ['工具'] }])],
    ['entries', JSON.stringify({ identity, entries: [] })],
    [
      '字符串 tags',
      portalSource([{ title: '旧', url: 'https://old.example/', tags: '工具' }]),
    ],
    [
      'category',
      portalSource([{ title: '旧', url: 'https://old.example/', category: '工具' }]),
    ],
  ])('拒绝旧输入形状：%s', (_name, jsonText) => {
    expect(parsePortalSource(jsonText).ok).toBe(false)
  })

  it('一次返回身份、未知字段和重复条目的全部问题', () => {
    const parsed = parsePortalSource(
      portalSource(
        [
          { title: 'MDN', url: 'https://developer.mozilla.org/', tags: ['文档'] },
          {
            title: ' MDN ',
            url: 'https://developer.mozilla.org:443/#top',
            tags: ['参考'],
            extra: true,
          },
          { title: 'FTP', url: 'ftp://files.example/', tags: ['工具'] },
        ],
        { ...identity, monument: ['AB', '乙'], extra: true },
      ),
    )
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.issues.map(({ path, code }) => ({ path, code }))).toEqual([
      { path: '/identity/extra', code: 'unknown-field' },
      { path: '/identity/monument/0', code: 'invalid-value' },
      { path: '/bookmarks/1/extra', code: 'unknown-field' },
      { path: '/bookmarks/1/title', code: 'duplicate-title' },
      { path: '/bookmarks/1/url', code: 'duplicate-url' },
      { path: '/bookmarks/2/url', code: 'invalid-value' },
    ])
  })

  it('非法 JSON 返回结构化问题', () => {
    expect(parsePortalSource('{').ok).toBe(false)
    const parsed = parsePortalSource('{')
    if (parsed.ok) return
    expect(parsed.issues).toEqual([
      { path: '', code: 'invalid-json', message: '不是合法 JSON。' },
    ])
  })

  it('真实门户源满足 canonical interface', async () => {
    const jsonText = await readFile(new URL('../public/portal.json', import.meta.url), 'utf8')
    const parsed = parsePortalSource(jsonText)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries.length).toBeGreaterThan(0)
  })
})

describe('sevenWords', () => {
  it('按引用次数降序最多七个，次数相同保持先出现', () => {
    const tags = [
      { name: '文档', count: 2 },
      { name: '工具', count: 1 },
      { name: '设计', count: 1 },
      { name: '参考', count: 1 },
      { name: '博客', count: 1 },
      { name: '前端', count: 1 },
      { name: '未分类', count: 1 },
      { name: '冷门', count: 1 },
    ]
    expect(sevenWords(tags).map((tag) => tag.name)).toEqual([
      '文档',
      '工具',
      '设计',
      '参考',
      '博客',
      '前端',
      '未分类',
    ])
  })

  it('不足七个则全数返回', () => {
    expect(sevenWords([{ name: '文档', count: 2 }])).toEqual([{ name: '文档', count: 2 }])
  })
})

describe('summarizeEntryTags', () => {
  it('按当前条目汇总标签，同一条目同一标签只计一次', () => {
    const entries: BookmarkEntry[] = [
      { title: 'A', url: 'https://a.example/', displayUrl: 'a.example', tags: ['文档', '工具'] },
      { title: 'B', url: 'https://b.example/', displayUrl: 'b.example', tags: ['文档'] },
      { title: 'C', url: 'https://c.example/', displayUrl: 'c.example', tags: ['工具', '工具'] },
    ]
    expect(summarizeEntryTags(entries)).toEqual([
      { name: '文档', count: 2 },
      { name: '工具', count: 2 },
    ])
  })

  it('次数多的在前，同次数保持首次出现顺序', () => {
    const entries: BookmarkEntry[] = [
      { title: 'A', url: 'https://a.example/', displayUrl: 'a.example', tags: ['设计'] },
      { title: 'B', url: 'https://b.example/', displayUrl: 'b.example', tags: ['文档'] },
      { title: 'C', url: 'https://c.example/', displayUrl: 'c.example', tags: ['文档'] },
    ]
    expect(summarizeEntryTags(entries).map((tag) => tag.name)).toEqual(['文档', '设计'])
  })

  it('空集合得到空汇总', () => {
    expect(summarizeEntryTags([])).toEqual([])
  })
})

describe('searchEntries', () => {
  it('空白提问视为空，标签仍算有约束', () => {
    expect(queryIsEmpty(parseShelfQuery('  '))).toBe(true)
    expect(queryIsEmpty(parseShelfQuery('vite'))).toBe(false)
    expect(queryIsEmpty(parseShelfQuery('', ['go']))).toBe(false)
    expect(searchEntries(sample, parseShelfQuery(''))).toBe(sample)
  })

  it('在名称、描述、标签上匹配，标签约束仍精确', () => {
    expect(searchEntries(sample, parseShelfQuery('gorm 文档')).map((e) => e.title)).toEqual([
      'GORM 文档',
    ])
    expect(searchEntries(sample, parseShelfQuery('前端构建')).map((e) => e.title)).toEqual(['Vite'])
    expect(searchEntries(sample, parseShelfQuery('工具')).map((e) => e.title)).toEqual(['Vite'])
    expect(searchEntries(sample, parseShelfQuery('', ['go'])).map((e) => e.title)).toEqual([
      'GORM 文档',
    ])
    expect(searchEntries(sample, parseShelfQuery('vite', ['go']))).toEqual([])
  })

  it('不搜索 URL', () => {
    const extra: BookmarkEntry = {
      title: 'Hidden',
      url: 'https://github.com/example',
      displayUrl: 'github.com/example',
      tags: ['其它'],
      description: '无关键字',
    }
    expect(searchEntries([...sample, extra], parseShelfQuery('github'))).toEqual([])
  })

  it('整句提问，不是词与词 AND', () => {
    expect(searchEntries(sample, parseShelfQuery('Vite 构建'))).toEqual([])
  })

  it('标签精确约束不因子串误伤', () => {
    const extra: BookmarkEntry = {
      title: 'Algo',
      url: 'https://algo.example/',
      displayUrl: 'algo.example',
      tags: ['算法'],
      description: 'algo notes',
    }
    expect(searchEntries([...sample, extra], parseShelfQuery('', ['go'])).map((e) => e.title)).toEqual(
      ['GORM 文档'],
    )
  })

  it('标题精确优先于较弱命中', () => {
    const found = searchEntries(sample, parseShelfQuery('Vite'))
    expect(found[0]?.title).toBe('Vite')
  })
})

describe('loadPortalSource', () => {
  it('网络失败时返回 load-failed', async () => {
    const result = await loadPortalSource('/portal.json', vi.fn().mockRejectedValue(new Error('offline')))
    expect(result.status).toBe('load-failed')
  })

  it('HTTP 失败时返回 load-failed', async () => {
    const result = await loadPortalSource(
      '/portal.json',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    )
    expect(result.status).toBe('load-failed')
  })

  it('错误页消息只包含第一项和剩余数量', async () => {
    const result = await loadPortalSource(
      '/portal.json',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ entries: [] }), { status: 200 })),
    )
    expect(result).toEqual({
      status: 'invalid-source',
      message: '门户源无效：/entries 字段未定义；另有 2 项问题。',
    })
  })

  it('合法门户源返回目录', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        portalSource([
          { title: 'MDN', url: 'https://developer.mozilla.org/', tags: ['文档'] },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const result = await loadPortalSource('/portal.json', fetchImpl)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.catalog.entries).toHaveLength(1)
    expect(result.catalog.identity.wordmark).toBe('试厅')
  })
})
