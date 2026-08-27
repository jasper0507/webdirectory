import { describe, expect, it } from 'vitest'
import {
  applyPaper,
  isPaperName,
  nextPaper,
  PAPER_STORAGE_KEY,
  paperLabel,
  readPaper,
  toggleStoredPaper,
} from './theme.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem(key: string) {
      return Object.hasOwn(store, key) ? store[key]! : null
    },
    setItem(key: string, value: string) {
      store[key] = value
    },
  }
}

describe('paper', () => {
  it('只承认白日与夜间', () => {
    expect(isPaperName('day')).toBe(true)
    expect(isPaperName('night')).toBe(true)
    expect(isPaperName('bold')).toBe(false)
  })

  it('未存储时默认为白日', () => {
    expect(readPaper(null)).toBe('day')
    expect(readPaper(memoryStorage({ [PAPER_STORAGE_KEY]: 'night' }))).toBe('night')
  })

  it('页脚开关翻转纸面并持久化', () => {
    const storage = memoryStorage()
    const document = {
      documentElement: {
        dataset: {} as Record<string, string>,
        style: { colorScheme: '' },
      },
    }
    expect(toggleStoredPaper({ document, storage })).toBe('night')
    expect(document.documentElement.dataset.paper).toBe('night')
    expect(nextPaper('night')).toBe('day')
    expect(paperLabel('night')).toBe('夜间')
    applyPaper('day', { document, storage })
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
