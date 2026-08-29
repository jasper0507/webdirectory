import { describe, expect, it } from 'vitest'
import { resolveHallSubmit, type HallRow } from './ui.ts'
import type { BookmarkEntry } from './catalog.ts'

function titleRow(title: string, url: string): HallRow {
  const entry: BookmarkEntry = {
    title,
    url,
    displayUrl: 'example',
    tags: ['文档'],
  }
  return { kind: 'title', entry }
}

function tagRow(name: string): HallRow {
  return { kind: 'tag', tag: { name, count: 1 } }
}

describe('resolveHallSubmit', () => {
  it('选中标签行进入该类', () => {
    const rows = [tagRow('工具'), titleRow('Vite', 'https://vite.dev/')]
    expect(resolveHallSubmit(rows, 0, 'Vite')).toEqual({ kind: 'tag', tag: '工具' })
  })

  it('选中题名打开该书签', () => {
    const rows = [
      titleRow('Vite', 'https://vite.dev/'),
      titleRow('Vitess', 'https://vitess.io/'),
    ]
    expect(resolveHallSubmit(rows, 1, 'vit')).toEqual({ kind: 'open', url: 'https://vitess.io/' })
  })

  it('未选中时一律按提问词进货架，唯一题名也不打开', () => {
    expect(
      resolveHallSubmit([titleRow('Vite', 'https://vite.dev/')], -1, 'Vite'),
    ).toEqual({ kind: 'shelf', query: 'Vite' })
  })

  it('未选中时提问与标签同名仍当提问词，不进该类', () => {
    const rows = [tagRow('文档'), titleRow('MDN Web Docs', 'https://developer.mozilla.org/')]
    expect(resolveHallSubmit(rows, -1, '文档')).toEqual({ kind: 'shelf', query: '文档' })
  })

  it('空提交进入全部货架', () => {
    expect(resolveHallSubmit([], -1, '')).toEqual({ kind: 'shelf', query: '' })
  })

  it('无匹配仍把提问带到货架，不换成全部目录', () => {
    expect(resolveHallSubmit([], -1, 'qqqqnomatch')).toEqual({
      kind: 'shelf',
      query: 'qqqqnomatch',
    })
  })

  it('多条题名未选中时进入货架搜索', () => {
    const rows = [
      titleRow('Vite', 'https://vite.dev/'),
      titleRow('Vitess', 'https://vitess.io/'),
    ]
    expect(resolveHallSubmit(rows, -1, '  vit  ')).toEqual({ kind: 'shelf', query: 'vit' })
  })
})
