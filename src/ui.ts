import {
  summarizeEntryTags,
  type BookmarkEntry,
  type SiteIdentity,
  type TagSummary,
} from './catalog.ts'

export function hallOptionId(index: number, prefix = 'hall-option'): string {
  return `${prefix}-${String(index)}`
}

export function fillIdentity(root: ParentNode, identity: SiteIdentity): void {
  root.querySelectorAll('[data-wordmark]').forEach((node) => {
    node.textContent = identity.wordmark
  })
  root.querySelectorAll('[data-stamp-en]').forEach((node) => {
    node.textContent = `${identity.stampEn} · `
  })
  root.querySelectorAll('[data-convergence]').forEach((node) => {
    node.textContent = identity.convergence
  })
  root.querySelectorAll('[data-eyebrow]').forEach((node) => {
    node.textContent = identity.eyebrow
  })
  const monument0 = root.querySelector('[data-monument-0]')
  const monument1 = root.querySelector('[data-monument-1]')
  if (monument0) monument0.textContent = identity.monument[0]
  if (monument1) monument1.textContent = identity.monument[1]
  root.querySelectorAll('[data-monument-label]').forEach((node) => {
    node.setAttribute('aria-label', `${identity.monument[0]}${identity.monument[1]}`)
  })
  root.querySelectorAll('[data-whisper]').forEach((node) => {
    node.textContent = `${identity.whisper[0]}\n${identity.whisper[1]}`
  })
  root.querySelectorAll('[data-colophon-left]').forEach((node) => {
    node.textContent = identity.colophonLeft
  })
  root.querySelectorAll('[data-colophon-right]').forEach((node) => {
    node.textContent = identity.colophonRight
  })
}

export function renderSevenWords(
  container: HTMLElement,
  tags: TagSummary[],
  onPick: (tag: string) => void,
): void {
  const fragment = document.createDocumentFragment()
  for (const tag of tags) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chip'
    button.textContent = tag.name
    button.setAttribute('aria-label', `进入标签 ${tag.name}`)
    button.addEventListener('click', () => onPick(tag.name))
    fragment.append(button)
  }
  container.replaceChildren(fragment)
}

export type HallRow =
  | { kind: 'tag'; tag: TagSummary }
  | { kind: 'title'; entry: BookmarkEntry }

export type HallSubmitAction =
  | { kind: 'open'; url: string }
  | { kind: 'shelf'; query: string }
  | { kind: 'tag'; tag: string }

export function flattenHallRows(tags: TagSummary[], titles: BookmarkEntry[]): HallRow[] {
  return [
    ...tags.map((tag) => ({ kind: 'tag' as const, tag })),
    ...titles.map((entry) => ({ kind: 'title' as const, entry })),
  ]
}

export function resolveHallSubmit(
  rows: HallRow[],
  selectedIndex: number,
  query: string,
): HallSubmitAction {
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : undefined
  if (selected?.kind === 'tag') return { kind: 'tag', tag: selected.tag.name }
  if (selected?.kind === 'title') return { kind: 'open', url: selected.entry.url }
  return { kind: 'shelf', query: query.trim() }
}

export function renderHallList(
  container: HTMLElement,
  tags: TagSummary[],
  titles: BookmarkEntry[],
  selectedIndex: number,
  onTag: (tag: string) => void,
  onTitle: (entry: BookmarkEntry) => void,
  optionPrefix = 'hall-option',
): HallRow[] {
  const rows = flattenHallRows(tags, titles)
  if (rows.length === 0) {
    container.replaceChildren()
    container.hidden = true
    return rows
  }

  const fragment = document.createDocumentFragment()
  if (tags.length > 0) {
    fragment.append(hallGroup('标签', () =>
      tags.map((tag, index) =>
        hallButton(
          'tag',
          index,
          selectedIndex,
          tag.name,
          String(tag.count),
          () => onTag(tag.name),
          optionPrefix,
        ),
      ),
    ))
  }
  if (titles.length > 0) {
    fragment.append(hallGroup('题名', () =>
      titles.map((entry, index) => {
        const absolute = tags.length + index
        return hallButton(
          'title',
          absolute,
          selectedIndex,
          entry.title,
          entry.displayUrl,
          () => onTitle(entry),
          optionPrefix,
        )
      }),
    ))
  }
  container.replaceChildren(fragment)
  container.hidden = false
  return rows
}

function hallGroup(label: string, options: () => HTMLButtonElement[]): HTMLDivElement {
  const group = document.createElement('div')
  group.role = 'group'
  group.setAttribute('aria-label', label)
  const caption = document.createElement('p')
  caption.className = 'hall-group-label'
  caption.textContent = label
  caption.setAttribute('aria-hidden', 'true')
  group.append(caption, ...options())
  return group
}

function hallButton(
  kind: string,
  index: number,
  selectedIndex: number,
  title: string,
  meta: string,
  onClick: () => void,
  optionPrefix: string,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.id = hallOptionId(index, optionPrefix)
  button.role = 'option'
  button.tabIndex = -1
  button.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false')
  button.className = index === selectedIndex ? 'hall-item is-active' : 'hall-item'
  button.dataset.kind = kind
  button.dataset.index = String(index)
  const name = document.createElement('span')
  name.className = 'hall-item-title'
  name.textContent = title
  const aside = document.createElement('span')
  aside.className = 'hall-item-meta'
  aside.textContent = meta
  button.append(name, aside)
  button.addEventListener('click', onClick)
  return button
}

function bookmarkCard(
  template: HTMLTemplateElement,
  entry: BookmarkEntry,
  onTag: (tag: string) => void,
  boundTags: string[],
): HTMLElement | null {
  const node = template.content.firstElementChild
  if (!node) return null
  const card = node.cloneNode(true) as HTMLElement
  const link = card.querySelector<HTMLAnchorElement>('.card-main')
  if (link) {
    link.href = entry.url
    link.setAttribute('aria-label', `打开 ${entry.title}（新标签页）`)
  }
  const title = card.querySelector('.card-title')
  if (title) title.textContent = entry.title
  const url = card.querySelector<HTMLElement>('.card-url')
  if (url) {
    url.textContent = entry.displayUrl
    url.title = entry.url
  }
  const description = card.querySelector<HTMLElement>('.card-desc')
  if (description) {
    description.textContent = entry.description ?? ''
    if (entry.description) {
      description.removeAttribute('aria-hidden')
    } else {
      description.setAttribute('aria-hidden', 'true')
    }
  }
  const tags = card.querySelector('.card-tags')
  if (tags) {
    tags.replaceChildren()
    for (const tag of entry.tags) {
      const chip = document.createElement('button')
      chip.type = 'button'
      const bound = boundTags.includes(tag)
      chip.className = bound ? 'card-tag is-bound' : 'card-tag'
      chip.textContent = tag
      if (bound) chip.setAttribute('aria-current', 'true')
      chip.setAttribute('aria-label', `进入标签 ${tag}`)
      chip.addEventListener('click', () => onTag(tag))
      tags.append(chip)
    }
  }
  return card
}

export const CARD_PAINT_BATCH = 48

const shelfPaints = new WeakMap<HTMLElement, number>()

export function cancelShelfPaint(container: HTMLElement): void {
  const nodes: HTMLElement[] = [container]
  container.querySelectorAll('.result-grid').forEach((node) => {
    if (node instanceof HTMLElement) nodes.push(node)
  })
  for (const node of nodes) {
    const id = shelfPaints.get(node)
    if (id !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(id)
    }
    shelfPaints.delete(node)
  }
}

function paintShelf(
  container: HTMLElement,
  entries: BookmarkEntry[],
  template: HTMLTemplateElement,
  onTag: (tag: string) => void,
  boundTags: string[],
): void {
  cancelShelfPaint(container)
  container.replaceChildren()
  let index = 0
  const step = (): void => {
    const fragment = document.createDocumentFragment()
    const end = Math.min(index + CARD_PAINT_BATCH, entries.length)
    for (; index < end; index += 1) {
      const entry = entries[index]
      if (!entry) continue
      const card = bookmarkCard(template, entry, onTag, boundTags)
      if (card) fragment.append(card)
    }
    container.append(fragment)
    if (index < entries.length) {
      if (typeof requestAnimationFrame === 'function') {
        shelfPaints.set(container, requestAnimationFrame(step))
      } else {
        step()
      }
      return
    }
    shelfPaints.delete(container)
  }
  step()
}

function renderResultTags(
  container: HTMLElement,
  tags: TagSummary[],
  boundTags: string[],
  onTag: (tag: string) => void,
): void {
  if (tags.length === 0) return
  const nav = document.createElement('nav')
  nav.className = 'result-tags'
  nav.setAttribute('aria-label', '本次结果标签')
  for (const tag of tags) {
    const bound = boundTags.includes(tag.name)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = bound ? 'chip is-bound' : 'chip'
    button.textContent = `${tag.name} · ${String(tag.count)}`
    if (bound) button.setAttribute('aria-current', 'true')
    button.setAttribute('aria-label', `进入标签 ${tag.name}`)
    button.addEventListener('click', () => onTag(tag.name))
    nav.append(button)
  }
  container.append(nav)
}

export function renderCards(
  container: HTMLElement,
  template: HTMLTemplateElement,
  entries: BookmarkEntry[],
  onTag: (tag: string) => void,
  boundTags: string[] = [],
): void {
  cancelShelfPaint(container)
  container.replaceChildren()
  renderResultTags(container, summarizeEntryTags(entries), boundTags, onTag)
  const grid = document.createElement('div')
  grid.className = 'result-grid'
  container.append(grid)
  paintShelf(grid, entries, template, onTag, boundTags)
}

export function showPanel(container: HTMLElement, template: HTMLTemplateElement): HTMLElement {
  cancelShelfPaint(container)
  const node = template.content.firstElementChild
  if (!node) throw new Error('状态模板为空')
  const panel = node.cloneNode(true) as HTMLElement
  container.replaceChildren(panel)
  return panel
}
