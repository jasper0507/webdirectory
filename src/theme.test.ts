import { describe, expect, it } from 'vitest'
import {
  applyTheme,
  isThemeName,
  nextTheme,
  readTheme,
  THEME_STORAGE_KEY,
  themeLabel,
  toggleStoredTheme,
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
    snapshot() {
      return { ...store }
    },
  }
}

describe('theme', () => {
  it('只承认克制与大胆', () => {
    expect(isThemeName('restrained')).toBe(true)
    expect(isThemeName('bold')).toBe(true)
    expect(isThemeName('dark')).toBe(false)
    expect(isThemeName(null)).toBe(false)
  })

  it('在两个主题之间切换', () => {
    expect(nextTheme('restrained')).toBe('bold')
    expect(nextTheme('bold')).toBe('restrained')
    expect(themeLabel('restrained')).toBe('克制')
    expect(themeLabel('bold')).toBe('大胆')
  })

  it('未存储时默认为克制', () => {
    expect(readTheme(null)).toBe('restrained')
    expect(readTheme(memoryStorage())).toBe('restrained')
    expect(readTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('restrained')
    expect(readTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'bold' }))).toBe('bold')
  })

  it('写入 html 数据属性并持久化', () => {
    const storage = memoryStorage()
    const document = {
      documentElement: {
        dataset: {} as Record<string, string>,
        style: { colorScheme: '' },
      },
    }
    applyTheme('bold', { document, storage })
    expect(document.documentElement.dataset.theme).toBe('bold')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(storage.snapshot()[THEME_STORAGE_KEY]).toBe('bold')
  })

  it('Logo 切换会翻转当前主题', () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: 'restrained' })
    const document = {
      documentElement: {
        dataset: { theme: 'restrained' } as Record<string, string>,
        style: { colorScheme: 'light' },
      },
    }
    expect(toggleStoredTheme({ document, storage })).toBe('bold')
    expect(toggleStoredTheme({ document, storage })).toBe('restrained')
  })
})
