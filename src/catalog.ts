export type BookmarkEntry = {
  title: string
  url: string
  displayUrl: string
  category?: string
  description?: string
}

export type CategorySummary = {
  name: string
  count: number
}

export type Catalog = {
  entries: BookmarkEntry[]
  categories: CategorySummary[]
}

export type ParseSuccess = {
  ok: true
  catalog: Catalog
}

export type ParseFailure = {
  ok: false
  error: string
}

export type ParseResult = ParseSuccess | ParseFailure

export type LoadResult =
  | { status: 'ok'; catalog: Catalog }
  | { status: 'load-failed'; message: string }
  | { status: 'invalid-source'; message: string }

export type FilterQuery = {
  query: string
  category: string | null
}

const TITLE_COMPARISON = 'NFC'

export function normalizeTitle(title: string): string {
  return title.trim().normalize(TITLE_COMPARISON)
}

export function normalizeCategory(value: string): string | undefined {
  const normalized = value.trim().normalize(TITLE_COMPARISON)
  return normalized === '' ? undefined : normalized
}

export function standardizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    parsed.hostname = parsed.hostname.toLowerCase()
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = ''
    }
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '')
      if (parsed.pathname === '') parsed.pathname = '/'
    }
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    const search = parsed.search
    return `${host}${path}${search}`
  } catch {
    return url
  }
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readBookmarkList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  const record = asObjectRecord(raw)
  if (!record) return null
  if (Array.isArray(record.bookmarks)) return record.bookmarks
  if (Array.isArray(record.entries)) return record.entries
  return null
}

function parseEntry(value: unknown): BookmarkEntry | null {
  const record = asObjectRecord(value)
  if (!record) return null
  if (typeof record.title !== 'string' || typeof record.url !== 'string') return null
  const title = normalizeTitle(record.title)
  const url = standardizeUrl(record.url)
  if (!title || !url) return null
  const category =
    typeof record.category === 'string' ? normalizeCategory(record.category) : undefined
  const description =
    typeof record.description === 'string'
      ? record.description.trim() === ''
        ? undefined
        : record.description.trim()
      : undefined
  return {
    title,
    url,
    displayUrl: displayUrl(url),
    ...(category ? { category } : {}),
    ...(description ? { description } : {}),
  }
}

function summarizeCategories(entries: BookmarkEntry[]): CategorySummary[] {
  const order: string[] = []
  const counts = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.category) continue
    if (!counts.has(entry.category)) order.push(entry.category)
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
  }
  return order.map((name) => ({ name, count: counts.get(name) ?? 0 }))
}

export function parseBookmarkSource(raw: unknown): ParseResult {
  const list = readBookmarkList(raw)
  if (!list) {
    return { ok: false, error: '书签源必须是数组，或带 bookmarks 字段的对象。' }
  }

  const entries: BookmarkEntry[] = []
  const seenTitles = new Set<string>()
  const seenUrls = new Set<string>()

  for (const item of list) {
    const entry = parseEntry(item)
    if (!entry) continue
    if (seenTitles.has(entry.title) || seenUrls.has(entry.url)) continue
    seenTitles.add(entry.title)
    seenUrls.add(entry.url)
    entries.push(entry)
  }

  return {
    ok: true,
    catalog: {
      entries,
      categories: summarizeCategories(entries),
    },
  }
}

function haystack(entry: BookmarkEntry): string {
  return [entry.title, entry.url, entry.displayUrl, entry.description, entry.category]
    .filter((part): part is string => Boolean(part))
    .join('\n')
    .normalize(TITLE_COMPARISON)
    .toLowerCase()
}

export function filterEntries(entries: BookmarkEntry[], filter: FilterQuery): BookmarkEntry[] {
  const category = filter.category ? normalizeCategory(filter.category) : undefined
  const tokens = filter.query
    .trim()
    .normalize(TITLE_COMPARISON)
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)

  return entries.filter((entry) => {
    if (category && entry.category !== category) return false
    if (tokens.length === 0) return true
    const text = haystack(entry)
    return tokens.every((token) => text.includes(token))
  })
}

export async function loadBookmarkSource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadResult> {
  let response: Response
  try {
    response = await fetchImpl(url, { headers: { Accept: 'application/json' } })
  } catch {
    return { status: 'load-failed', message: '无法连接到书签源。' }
  }

  if (!response.ok) {
    return { status: 'load-failed', message: `书签源返回 ${String(response.status)}。` }
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return { status: 'invalid-source', message: '书签源不是合法 JSON。' }
  }

  const parsed = parseBookmarkSource(raw)
  if (!parsed.ok) return { status: 'invalid-source', message: parsed.error }
  return { status: 'ok', catalog: parsed.catalog }
}
