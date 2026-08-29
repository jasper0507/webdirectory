import Fuse from 'fuse.js/basic'

export type BookmarkEntry = {
  title: string
  url: string
  displayUrl: string
  tags: string[]
  description?: string
}

export type TagSummary = {
  name: string
  count: number
}

export type SiteIdentity = {
  wordmark: string
  monument: [string, string]
  eyebrow: string
  stampEn: string
  convergence: string
  whisper: [string, string]
  placeholder: string
  colophonLeft: string
  colophonRight: string
}

export type Catalog = {
  identity: SiteIdentity
  entries: BookmarkEntry[]
  tags: TagSummary[]
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

export type ShelfQuery = {
  raw: string
  terms: string[]
  tags: string[]
}

const TITLE_COMPARISON = 'NFC'
export const SEVEN_WORDS_LIMIT = 7
export const HALL_LIST_LIMIT = 7

export const DEFAULT_IDENTITY: SiteIdentity = {
  wordmark: '七卷拾光',
  monument: ['拾', '光'],
  eyebrow: 'BIBLIOTHECA',
  stampEn: 'SEVEN SHELVES',
  convergence: '七卷同归',
  whisper: ['在七座私人书架之间，键入一个名字，', '让收藏顺流而下。'],
  placeholder: '键入书签或站点...',
  colophonLeft: 'SHELVED FROM SEVEN ARCHIVES',
  colophonRight: 'SEVEN SHELVES · ONE STREAM',
}

export function normalizeTitle(title: string): string {
  return title.trim().normalize(TITLE_COMPARISON)
}

export function normalizeTag(value: string): string | undefined {
  const normalized = value.trim().normalize(TITLE_COMPARISON)
  return normalized === '' ? undefined : normalized
}

export function fold(value: string): string {
  return value.normalize(TITLE_COMPARISON).toLowerCase()
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

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readBookmarkList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  const record = asObjectRecord(raw)
  if (!record) return null
  if (Array.isArray(record.bookmarks)) return record.bookmarks
  if (Array.isArray(record.entries)) return record.entries
  return null
}

function uniqueTags(values: string[]): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const value of values) {
    const tag = normalizeTag(value)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
  }
  return tags
}

function readTags(record: Record<string, unknown>): string[] {
  const collected: string[] = []
  if (Array.isArray(record.tags)) {
    for (const item of record.tags) {
      if (typeof item === 'string') collected.push(item)
    }
  } else if (typeof record.tags === 'string') {
    collected.push(record.tags)
  }
  if (typeof record.category === 'string') collected.push(record.category)
  return uniqueTags(collected)
}

function parseEntry(value: unknown): BookmarkEntry | null {
  const record = asObjectRecord(value)
  if (!record) return null
  if (typeof record.title !== 'string' || typeof record.url !== 'string') return null
  const title = normalizeTitle(record.title)
  const url = standardizeUrl(record.url)
  const tags = readTags(record)
  if (!title || !url || tags.length === 0) return null
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
    tags,
    ...(description ? { description } : {}),
  }
}

export function summarizeTags(entries: BookmarkEntry[]): TagSummary[] {
  const order: string[] = []
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!counts.has(tag)) order.push(tag)
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return order.map((name) => ({ name, count: counts.get(name) ?? 0 }))
}

export function sevenWords(tags: TagSummary[]): TagSummary[] {
  return [...tags]
    .sort((a, b) => b.count - a.count || tags.indexOf(a) - tags.indexOf(b))
    .slice(0, SEVEN_WORDS_LIMIT)
}

export type TagChunk = {
  name: string
  entries: BookmarkEntry[]
}

export function groupEntriesByPrimaryTag(entries: BookmarkEntry[]): TagChunk[] {
  const order: string[] = []
  const grouped = new Map<string, BookmarkEntry[]>()
  for (const entry of entries) {
    const primary = entry.tags[0]
    if (!primary) continue
    const bucket = grouped.get(primary)
    if (bucket) {
      bucket.push(entry)
    } else {
      order.push(primary)
      grouped.set(primary, [entry])
    }
  }
  return order
    .map((name) => {
      const chunk = grouped.get(name) ?? []
      return { name, entries: chunk }
    })
    .sort((a, b) => b.entries.length - a.entries.length || order.indexOf(a.name) - order.indexOf(b.name))
}

function readPair(value: unknown, fallback: [string, string]): [string, string] {
  if (!Array.isArray(value) || value.length < 2) return fallback
  const first = typeof value[0] === 'string' ? value[0].trim() : ''
  const second = typeof value[1] === 'string' ? value[1].trim() : ''
  if (!first || !second) return fallback
  return [first, second]
}

export function parseIdentity(raw: unknown): SiteIdentity {
  const record = asObjectRecord(raw)
  if (!record) return { ...DEFAULT_IDENTITY, monument: [...DEFAULT_IDENTITY.monument], whisper: [...DEFAULT_IDENTITY.whisper] }
  const monument = readPair(record.monument, [...DEFAULT_IDENTITY.monument])
  const whisper = readPair(record.whisper, [...DEFAULT_IDENTITY.whisper])
  return {
    wordmark: normalizeTitle(readString(record.wordmark) ?? '') || DEFAULT_IDENTITY.wordmark,
    monument,
    eyebrow: (readString(record.eyebrow) ?? '').trim() || DEFAULT_IDENTITY.eyebrow,
    stampEn: (readString(record.stampEn) ?? '').trim() || DEFAULT_IDENTITY.stampEn,
    convergence: (readString(record.convergence) ?? '').trim() || DEFAULT_IDENTITY.convergence,
    whisper,
    placeholder: (readString(record.placeholder) ?? '').trim() || DEFAULT_IDENTITY.placeholder,
    colophonLeft: (readString(record.colophonLeft) ?? '').trim() || DEFAULT_IDENTITY.colophonLeft,
    colophonRight: (readString(record.colophonRight) ?? '').trim() || DEFAULT_IDENTITY.colophonRight,
  }
}

export function parsePortalSource(raw: unknown): ParseResult {
  const list = readBookmarkList(raw)
  if (!list) {
    return { ok: false, error: '门户源必须带 bookmarks 数组，或本身就是数组。' }
  }

  const identity = parseIdentity(asObjectRecord(raw)?.identity)
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
      identity,
      entries,
      tags: summarizeTags(entries),
    },
  }
}

const SEARCH_FUSE_OPTIONS = {
  keys: ['title', 'description', 'tags'] as Array<'title' | 'description' | 'tags'>,
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1,
}

const fuseByEntries = new WeakMap<BookmarkEntry[], Fuse<BookmarkEntry>>()

function fuseFor(entries: BookmarkEntry[]): Fuse<BookmarkEntry> {
  const cached = fuseByEntries.get(entries)
  if (cached) return cached
  const fuse = new Fuse(entries, SEARCH_FUSE_OPTIONS)
  fuseByEntries.set(entries, fuse)
  return fuse
}

export function parseShelfQuery(raw: string, tagConstraints: string[] = []): ShelfQuery {
  const trimmed = raw.trim()
  return {
    raw: trimmed,
    terms: fold(trimmed).split(/\s+/u).filter(Boolean),
    tags: uniqueTags(tagConstraints),
  }
}

export function queryIsEmpty(query: ShelfQuery): boolean {
  return query.terms.length === 0 && query.tags.length === 0
}

export function searchEntries(entries: BookmarkEntry[], query: ShelfQuery): BookmarkEntry[] {
  const tagged =
    query.tags.length === 0
      ? entries
      : entries.filter((entry) => query.tags.every((tag) => entry.tags.includes(tag)))
  if (!query.raw) return tagged

  const fuse = fuseFor(entries)
  const scoreByUrl = new Map(
    fuse.search(query.raw).map((result) => [result.item.url, result.score ?? 1]),
  )
  return tagged
    .filter((entry) => scoreByUrl.has(entry.url))
    .sort((a, b) => (scoreByUrl.get(a.url) ?? 1) - (scoreByUrl.get(b.url) ?? 1))
}

export function matchingTags(tags: TagSummary[], input: string): TagSummary[] {
  const needle = fold(input.trim())
  if (!needle) return []
  return tags.filter((tag) => fold(tag.name).includes(needle))
}

export function hallSuggestions(
  entries: BookmarkEntry[],
  tags: TagSummary[],
  input: string,
): { tags: TagSummary[]; titles: BookmarkEntry[] } {
  const needle = input.trim()
  if (!needle) return { tags: [], titles: [] }
  const query = parseShelfQuery(needle)
  const tagsFound = matchingTags(tags, needle).slice(0, 3)
  const titles = searchEntries(entries, query).slice(0, HALL_LIST_LIMIT - tagsFound.length)
  return {
    tags: tagsFound,
    titles,
  }
}

export async function loadPortalSource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadResult> {
  let response: Response
  try {
    response = await fetchImpl(url, { headers: { Accept: 'application/json' } })
  } catch {
    return { status: 'load-failed', message: '无法连接到门户源。' }
  }

  if (!response.ok) {
    return { status: 'load-failed', message: `门户源返回 ${String(response.status)}。` }
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return { status: 'invalid-source', message: '门户源不是合法 JSON。' }
  }

  const parsed = parsePortalSource(raw)
  if (!parsed.ok) return { status: 'invalid-source', message: parsed.error }
  return { status: 'ok', catalog: parsed.catalog }
}
