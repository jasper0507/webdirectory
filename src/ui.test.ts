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
  it('无选中且唯一题名时打开该书签', () => {
    expect(
      resolveHallSubmit([titleRow('Vite', 'https://vite.dev/')], -1, 'Vite'),
    ).toEqual({ kind: 'open', url: 'https://vite.dev/' })
  })

  it('无选中且唯一题名旁有标签行时仍打开该书签', () => {
    const rows = [tagRow('工具'), titleRow('Vite', 'https://vite.dev/')]
    expect(resolveHallSubmit(rows, -1, 'Vite')).toEqual({ kind: 'open', url: 'https://vite.dev/' })
  })

  it('选中标签行进入该标签货架', () => {
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

  it('空提交进入货架', () => {
    expect(resolveHallSubmit([], -1, '')).toEqual({ kind: 'shelf', query: '' })
  })

  it('厅内无匹配时进入全部货架，不把死查询带去空货架', () => {
    expect(resolveHallSubmit([], -1, 'qqqqnomatch')).toEqual({ kind: 'shelf', query: '' })
  })

  it('多条题名未选中时进入货架', () => {
    const rows = [
      titleRow('Vite', 'https://vite.dev/'),
      titleRow('Vitess', 'https://vitess.io/'),
    ]
    expect(resolveHallSubmit(rows, -1, 'vit')).toEqual({ kind: 'shelf', query: 'vit' })
  })

  it('提问与标签名相同时进入该标签货架，不当成模糊词', () => {
    expect(resolveHallSubmit([tagRow('文档')], -1, '文档')).toEqual({
      kind: 'tag',
      tag: '文档',
    })
  })

  it('提问与标签名相同且旁有题名时仍进该标签货架', () => {
    const rows = [tagRow('文档'), titleRow('MDN Web Docs', 'https://developer.mozilla.org/')]
    expect(resolveHallSubmit(rows, -1, '文档')).toEqual({ kind: 'tag', tag: '文档' })
  })
})
