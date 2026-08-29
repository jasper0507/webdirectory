// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookmarkEntry, TagSummary } from './catalog.ts'
import { wireQuestion } from './question.ts'

function mountQuestion(id: string): HTMLFormElement {
  document.body.insertAdjacentHTML('beforeend', `
    <form action="/shelf" method="get">
      <input name="q" role="combobox" aria-controls="${id}" aria-expanded="false" />
      <div id="${id}" role="listbox" hidden></div>
      <p aria-live="polite" hidden></p>
    </form>
  `)
  return document.body.lastElementChild as HTMLFormElement
}

const entries: BookmarkEntry[] = [
  {
    title: 'Vite',
    url: 'https://vite.dev/',
    displayUrl: 'vite.dev',
    tags: ['Vite工具'],
  },
]

const tags: TagSummary[] = [{ name: 'Vite工具', count: 1 }]

describe('提问', () => {
  beforeEach(() => document.body.replaceChildren())

  it('按标签后题名的同一行序显示建议', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const list = form.querySelector<HTMLElement>('[role="listbox"]')!
    wireQuestion(form, () => ({ entries, tags }), vi.fn())

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(
      Array.from(list.querySelectorAll('[role="option"]'), (option) => option.textContent),
    ).toEqual(['Vite工具1', 'Vitevite.dev'])
    expect(list.hidden).toBe(false)
    expect(input.getAttribute('aria-expanded')).toBe('true')
  })

  it('标签最多三条，并由题名补齐到七条', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const manyEntries: BookmarkEntry[] = Array.from({ length: 8 }, (_, index) => ({
      title: `Vite ${String(index + 1)}`,
      url: `https://vite-${String(index + 1)}.example/`,
      displayUrl: `vite-${String(index + 1)}.example`,
      tags: ['工具'],
    }))
    const manyTags: TagSummary[] = Array.from({ length: 5 }, (_, index) => ({
      name: `vite-${String(index + 1)}`,
      count: 5 - index,
    }))
    wireQuestion(form, () => ({ entries: manyEntries, tags: manyTags }), vi.fn())

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(form.querySelectorAll('[role="group"][aria-label="标签"] [role="option"]')).toHaveLength(3)
    expect(form.querySelectorAll('[role="option"]')).toHaveLength(7)
  })

  it('键盘选亮建议时同步 ARIA，并按回车采用该建议', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const applyAction = vi.fn()
    wireQuestion(form, () => ({ entries, tags }), applyAction)

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    const selected = form.querySelector<HTMLElement>('[role="option"]')!
    expect(selected.getAttribute('aria-selected')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(selected.id)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(applyAction).toHaveBeenCalledWith({ kind: 'tag', tag: 'Vite工具' })
  })

  it('未选亮建议时提交提问，而不采用唯一命中', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const applyAction = vi.fn()
    wireQuestion(form, () => ({ entries, tags }), applyAction)

    input.value = '  vite  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))

    expect(applyAction).toHaveBeenCalledWith({ kind: 'shelf', query: 'vite' })
  })

  it('门户源尚未加载时保持建议与空态收起', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    wireQuestion(form, () => null, vi.fn())

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(form.querySelector<HTMLElement>('[role="listbox"]')!.hidden).toBe(true)
    expect(form.querySelector<HTMLElement>('[aria-live]')!.hidden).toBe(true)
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('点击题名建议会采用对应书签', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const applyAction = vi.fn()
    wireQuestion(form, () => ({ entries, tags }), applyAction)

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.querySelector<HTMLButtonElement>('[role="group"][aria-label="题名"] [role="option"]')!.click()

    expect(applyAction).toHaveBeenCalledWith({ kind: 'open', url: 'https://vite.dev/' })
  })

  it('Escape 先取消选亮，再清空提问并关闭建议', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const list = form.querySelector<HTMLElement>('[role="listbox"]')!
    wireQuestion(form, () => ({ entries, tags }), vi.fn())
    const onInput = vi.fn()
    input.addEventListener('input', onInput)

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    onInput.mockClear()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(input.value).toBe('vite')
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    expect(list.hidden).toBe(false)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input.value).toBe('')
    expect(list.hidden).toBe(true)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(onInput).toHaveBeenCalledOnce()
  })

  it('中文输入法组合期间按回车不会采用建议', () => {
    const form = mountQuestion('hall-list')
    const input = form.elements.namedItem('q') as HTMLInputElement
    const applyAction = vi.fn()
    wireQuestion(form, () => ({ entries, tags }), applyAction)

    input.value = 'vite'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
    )

    expect(applyAction).not.toHaveBeenCalled()
  })

  it('厅架实例状态独立，reset 只清理目标实例', () => {
    const hall = mountQuestion('hall-list')
    const shelf = mountQuestion('shelf-list')
    const hallInput = hall.elements.namedItem('q') as HTMLInputElement
    const shelfInput = shelf.elements.namedItem('q') as HTMLInputElement
    const hallAction = vi.fn()
    wireQuestion(hall, () => ({ entries, tags }), hallAction)
    const resetShelf = wireQuestion(shelf, () => ({ entries, tags }), vi.fn())

    hallInput.value = 'vite'
    hallInput.dispatchEvent(new Event('input', { bubbles: true }))
    hallInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    shelfInput.value = '没有命中'
    shelfInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(shelf.querySelector<HTMLElement>('[aria-live]')!.hidden).toBe(false)
    hallInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(hallAction).toHaveBeenCalledWith({ kind: 'tag', tag: 'Vite工具' })

    resetShelf('原有提问')
    expect(shelfInput.value).toBe('原有提问')
    expect(shelf.querySelector<HTMLElement>('[role="listbox"]')!.hidden).toBe(true)
    expect(shelf.querySelector<HTMLElement>('[aria-live]')!.hidden).toBe(true)
    expect(shelfInput.getAttribute('aria-expanded')).toBe('false')
  })
})
