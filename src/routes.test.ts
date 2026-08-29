import { describe, expect, it } from 'vitest'
import { hallPath, parseRoute, shelfPath } from './routes.ts'

describe('routes', () => {
  it('提问与标签互斥，标签只取一个', () => {
    expect(parseRoute(new URL('http://localhost/shelf?q=go&tag=gorm&tag=orm'))).toEqual({
      name: 'shelf',
      query: 'go',
      tags: [],
    })
    expect(parseRoute(new URL('http://localhost/shelf?tag=gorm&tag=orm'))).toEqual({
      name: 'shelf',
      query: '',
      tags: ['gorm'],
    })
  })

  it('空货架走 /shelf', () => {
    expect(shelfPath()).toBe('/shelf')
    expect(shelfPath('  vite  ', ['工具'])).toBe('/shelf?q=vite')
    expect(shelfPath('', ['工具', '文档'])).toBe('/shelf?tag=%E5%B7%A5%E5%85%B7')
    expect(hallPath()).toBe('/')
    expect(parseRoute(new URL('http://localhost/')).name).toBe('hall')
  })
})
