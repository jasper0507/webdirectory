import { describe, expect, it } from 'vitest'
import { hallPath, parseRoute, shelfPath } from './routes.ts'

describe('routes', () => {
  it('解析货架查询与多个标签', () => {
    const route = parseRoute(new URL('http://localhost/shelf?q=go&tag=gorm&tag=orm'))
    expect(route).toEqual({ name: 'shelf', query: 'go', tags: ['gorm', 'orm'] })
  })

  it('空约束走 /shelf', () => {
    expect(shelfPath()).toBe('/shelf')
    expect(shelfPath('  vite  ', ['工具'])).toBe('/shelf?q=vite&tag=%E5%B7%A5%E5%85%B7')
    expect(hallPath()).toBe('/')
    expect(parseRoute(new URL('http://localhost/')).name).toBe('hall')
  })
})
