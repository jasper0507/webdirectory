export type HallRoute = { name: 'hall' }

export type ShelfRoute = {
  name: 'shelf'
  query: string
  tags: string[]
}

export type AppRoute = HallRoute | ShelfRoute

function firstTag(values: string[]): string[] {
  for (const value of values) {
    const tag = value.trim()
    if (tag) return [tag]
  }
  return []
}

export function parseRoute(url: URL): AppRoute {
  const path = url.pathname.replace(/\/+$/u, '') || '/'
  if (path === '/shelf') {
    const query = (url.searchParams.get('q') ?? '').trim()
    return {
      name: 'shelf',
      query,
      tags: query ? [] : firstTag(url.searchParams.getAll('tag')),
    }
  }
  return { name: 'hall' }
}

export function hallPath(): string {
  return '/'
}

export function shelfPath(query = '', tags: string[] = []): string {
  const params = new URLSearchParams()
  const trimmed = query.trim()
  if (trimmed) {
    params.set('q', trimmed)
  } else {
    const tag = firstTag(tags)[0]
    if (tag) params.set('tag', tag)
  }
  const encoded = params.toString()
  return encoded ? `/shelf?${encoded}` : '/shelf'
}
