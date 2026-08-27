export type HallRoute = { name: 'hall' }

export type ShelfRoute = {
  name: 'shelf'
  query: string
  tags: string[]
}

export type AppRoute = HallRoute | ShelfRoute

export function parseRoute(url: URL): AppRoute {
  const path = url.pathname.replace(/\/+$/u, '') || '/'
  if (path === '/shelf') {
    return {
      name: 'shelf',
      query: url.searchParams.get('q') ?? '',
      tags: url.searchParams.getAll('tag'),
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
  if (trimmed) params.set('q', trimmed)
  for (const tag of tags) {
    const value = tag.trim()
    if (value) params.append('tag', value)
  }
  const encoded = params.toString()
  return encoded ? `/shelf?${encoded}` : '/shelf'
}
