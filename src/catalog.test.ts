import { describe, expect, it, vi } from 'vitest'
import {
  fold,
  groupEntriesByPrimaryTag,
  hallSuggestions,
  loadPortalSource,
  normalizeTag,
  normalizeTitle,
  parsePortalSource,
  parseShelfQuery,
  queryIsEmpty,
  searchEntries,
  sevenWords,
  standardizeUrl,
  summarizeEntryTags,
  summarizeTags,
  type BookmarkEntry,
} from './catalog.ts'

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

describe('normalizeTitle', () => {
  it('去掉首尾空格并做 Unicode 标准化', () => {
    expect(normalizeTitle('  Café  ')).toBe('Café')
    expect(normalizeTitle('Cafe\u0301')).toBe('Café')
  })
})

describe('normalizeTag', () => {
  it('空字符串视为空值，保留大小写', () => {
    expect(normalizeTag('')).toBeUndefined()
    expect(normalizeTag('   ')).toBeUndefined()
    expect(normalizeTag(' Go ')).toBe('Go')
    expect(normalizeTag('go')).toBe('go')
  })
})

describe('standardizeUrl', () => {
  it('拒绝非 http(s) 地址', () => {
    expect(standardizeUrl('ftp://example.com/file')).toBeNull()
    expect(standardizeUrl('javascript:alert(1)')).toBeNull()
  })

  it('小写主机名、去掉默认端口和尾斜杠', () => {
    expect(standardizeUrl('HTTPS://Example.COM:443/path/')).toBe('https://example.com/path')
  })
})

describe('parsePortalSource', () => {
  it('读取身份和书签', () => {
    const parsed = parsePortalSource({
      identity: { wordmark: '试厅', monument: ['甲', '乙'] },
      bookmarks: [{ title: 'MDN', url: 'https://developer.mozilla.org/', tags: ['文档'] }],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.identity.wordmark).toBe('试厅')
    expect(parsed.catalog.identity.monument).toEqual(['甲', '乙'])
    expect(parsed.catalog.entries).toHaveLength(1)
    expect(parsed.catalog.tags).toEqual([{ name: '文档', count: 1 }])
  })

  it('旧 category 写成标签；无标签则丢弃', () => {
    const parsed = parsePortalSource([
      { title: '旧', url: 'https://old.example/', category: '工具' },
      { title: '空', url: 'https://empty.example/' },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries.map((entry) => entry.title)).toEqual(['旧'])
    expect(parsed.catalog.entries[0]?.tags).toEqual(['工具'])
  })

  it('同一条目内标签去重，并丢弃重复标题', () => {
    const parsed = parsePortalSource([
      { title: 'GitHub', url: 'https://github.com/', tags: ['工具', '工具', ''] },
      { title: 'GitHub', url: 'https://other.example/', tags: ['镜像'] },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.catalog.entries).toHaveLength(1)
    expect(parsed.catalog.entries[0]?.tags).toEqual(['工具'])
  })
})

describe('sevenWords', () => {
  it('按引用次数降序最多七个，次数相同保持先出现', () => {
    const tags = summarizeTags([
      { title: 'A', url: 'https://a.example/', displayUrl: 'a.example', tags: ['文档', '工具'] },
      { title: 'B', url: 'https://b.example/', displayUrl: 'b.example', tags: ['文档'] },
      { title: 'C', url: 'https://c.example/', displayUrl: 'c.example', tags: ['设计'] },
      { title: 'D', url: 'https://d.example/', displayUrl: 'd.example', tags: ['参考'] },
      { title: 'E', url: 'https://e.example/', displayUrl: 'e.example', tags: ['博客'] },
      { title: 'F', url: 'https://f.example/', displayUrl: 'f.example', tags: ['前端'] },
      { title: 'G', url: 'https://g.example/', displayUrl: 'g.example', tags: ['未分类'] },
      { title: 'H', url: 'https://h.example/', displayUrl: 'h.example', tags: ['冷门'] },
    ])
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

describe('groupEntriesByPrimaryTag', () => {
  it('按首个标签分块，大块在前，块内保持目录顺序', () => {
    const entries: BookmarkEntry[] = [
      { title: 'A', url: 'https://a.example/', displayUrl: 'a.example', tags: ['设计'] },
      { title: 'B', url: 'https://b.example/', displayUrl: 'b.example', tags: ['文档', '工具'] },
      { title: 'C', url: 'https://c.example/', displayUrl: 'c.example', tags: ['文档'] },
      { title: 'D', url: 'https://d.example/', displayUrl: 'd.example', tags: ['工具'] },
    ]
    const chunks = groupEntriesByPrimaryTag(entries)
    expect(chunks.map((chunk) => chunk.name)).toEqual(['文档', '设计', '工具'])
    expect(chunks[0]?.entries.map((entry) => entry.title)).toEqual(['B', 'C'])
    expect(chunks[1]?.entries.map((entry) => entry.title)).toEqual(['A'])
    expect(chunks[2]?.entries.map((entry) => entry.title)).toEqual(['D'])
  })

  it('多标签条目只出现在首个标签的块里', () => {
    const chunks = groupEntriesByPrimaryTag([
      { title: 'A', url: 'https://a.example/', displayUrl: 'a.example', tags: ['文档', '工具'] },
    ])
    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.name).toBe('文档')
  })

  it('空目录得到空分块', () => {
    expect(groupEntriesByPrimaryTag([])).toEqual([])
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

describe('hallSuggestions', () => {
  it('空输入不列列表', () => {
    expect(hallSuggestions(sample, summarizeTags(sample), '  ')).toEqual({ tags: [], titles: [] })
  })

  it('列出匹配标签和题名', () => {
    const suggestions = hallSuggestions(sample, summarizeTags(sample), 'go')
    expect(suggestions.tags.map((tag) => tag.name)).toEqual(['go', 'gorm'])
    expect(suggestions.titles[0]?.title).toBe('GORM 文档')
  })
})

describe('loadPortalSource', () => {
  it('网络失败时返回 load-failed', async () => {
    const result = await loadPortalSource('/portal.json', vi.fn().mockRejectedValue(new Error('offline')))
    expect(result.status).toBe('load-failed')
  })

  it('合法门户源返回目录', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ bookmarks: [{ title: 'MDN', url: 'https://developer.mozilla.org/', tags: ['文档'] }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await loadPortalSource('/portal.json', fetchImpl)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.catalog.entries).toHaveLength(1)
    expect(result.catalog.identity.wordmark).toBe('七卷拾光')
  })
})

describe('fold', () => {
  it('用于搜索比较', () => {
    expect(fold('  Go ')).toBe('  go ')
  })
})
