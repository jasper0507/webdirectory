// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { CARD_PAINT_BATCH, renderCards } from './ui.ts'
import type { BookmarkEntry } from './catalog.ts'

afterEach(() => vi.unstubAllGlobals())

it('第二次货架渲染会取消第一次未完成的批次', () => {
  let nextFrame = 1
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(nextFrame, callback)
    return nextFrame++
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))

  const template = document.createElement('template')
  template.innerHTML = '<article></article>'
  const entries: BookmarkEntry[] = Array.from({ length: CARD_PAINT_BATCH + 1 }, (_, index) => ({
    title: String(index),
    url: `https://${String(index)}.example/`,
    displayUrl: `${String(index)}.example`,
    tags: ['测试'],
  }))
  const first = document.createElement('div')
  const second = document.createElement('div')

  renderCards(first, template, entries, () => {})
  renderCards(second, template, entries.slice(0, 1), () => {})
  for (const callback of frames.values()) callback(0)

  expect(first.querySelectorAll('article')).toHaveLength(CARD_PAINT_BATCH)
})
