import {
  fold,
  type BookmarkEntry,
  type SiteIdentity,
  type TagChunk,
  type TagSummary,
} from './catalog.ts'

export function hallOptionId(index: number): string {
  return `hall-option-${String(index)}`
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
    button.setAttribute('aria-label', `按标签 ${tag.name} 进入货架`)
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

  const needle = fold(query.trim())
  if (needle) {
    const exactTag = rows.find((row) => row.kind === 'tag' && fold(row.tag.name) === needle)
    if (exactTag?.kind === 'tag') return { kind: 'tag', tag: exactTag.tag.name }
  }

  const titles = rows.filter((row): row is Extract<HallRow, { kind: 'title' }> => row.kind === 'title')
  const soleTitle = titles.length === 1 ? titles[0] : undefined
  if (soleTitle) return { kind: 'open', url: soleTitle.entry.url }
  if (rows.length === 0) return { kind: 'shelf', query: '' }
  return { kind: 'shelf', query }
}

export function renderHallList(
  container: HTMLElement,
  tags: TagSummary[],
  titles: BookmarkEntry[],
  selectedIndex: number,
  onTag: (tag: string) => void,
  onTitle: (entry: BookmarkEntry) => void,
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
        hallButton('tag', index, selectedIndex, tag.name, String(tag.count), () => onTag(tag.name)),
      ),
    ))
  }
  if (titles.length > 0) {
    fragment.append(hallGroup('题名', () =>
      titles.map((entry, index) => {
        const absolute = tags.length + index
        return hallButton('title', absolute, selectedIndex, entry.title, entry.displayUrl, () => onTitle(entry))
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
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.id = hallOptionId(index)
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

export function renderConstraints(
  container: HTMLElement,
  query: string,
  tags: string[],
  onRemoveQuery: () => void,
  onRemoveTag: (tag: string) => void,
): void {
  const fragment = document.createDocumentFragment()
  const trimmed = query.trim()
  if (trimmed) {
    fragment.append(constraintChip('query', trimmed, onRemoveQuery))
  }
  for (const tag of tags) {
    fragment.append(constraintChip('tag', tag, () => onRemoveTag(tag)))
  }
  const empty = fragment.childNodes.length === 0
  if (empty) {
    container.replaceChildren()
    container.hidden = true
    container.removeAttribute('aria-label')
    return
  }
  container.replaceChildren(shelfCaption('已约束'), fragment)
  container.hidden = false
  container.setAttribute('role', 'group')
  container.setAttribute('aria-label', '已约束')
}

function shelfCaption(label: string): HTMLParagraphElement {
  const caption = document.createElement('p')
  caption.className = 'hall-group-label'
  caption.textContent = label
  caption.setAttribute('aria-hidden', 'true')
  return caption
}

function constraintChip(
  kind: 'query' | 'tag',
  value: string,
  onRemove: () => void,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'constraint-chip'
  button.setAttribute('aria-label', kind === 'query' ? `移除提问 ${value}` : `移除标签 ${value}`)
  const text = document.createElement('span')
  text.textContent = kind === 'query' ? `提问 · ${value}` : value
  const mark = document.createElement('span')
  mark.className = 'constraint-remove'
  mark.textContent = '×'
  mark.ariaHidden = 'true'
  button.append(text, mark)
  button.addEventListener('click', onRemove)
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
    if (entry.description) {
      description.textContent = entry.description
      description.hidden = false
    } else {
      description.remove()
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
      chip.setAttribute('aria-pressed', bound ? 'true' : 'false')
      chip.setAttribute('aria-label', bound ? `已用标签 ${tag} 约束货架` : `用标签 ${tag} 约束货架`)
      if (bound) chip.disabled = true
      else chip.addEventListener('click', () => onTag(tag))
      tags.append(chip)
    }
  }
  return card
}

export const CARD_PAINT_BATCH = 48

type ShelfNode =
  | { kind: 'label'; text: string }
  | { kind: 'card'; entry: BookmarkEntry }

const shelfPaints = new WeakMap<HTMLElement, number>()

export function cancelShelfPaint(container: HTMLElement): void {
  const id = shelfPaints.get(container)
  if (id !== undefined && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id)
  }
  shelfPaints.delete(container)
}

function paintShelf(
  container: HTMLElement,
  nodes: ShelfNode[],
  template: HTMLTemplateElement,
  onTag: (tag: string) => void,
  boundTags: string[],
): void {
  cancelShelfPaint(container)
  container.replaceChildren()
  let index = 0
  const step = (): void => {
    const fragment = document.createDocumentFragment()
    const end = Math.min(index + CARD_PAINT_BATCH, nodes.length)
    for (; index < end; index += 1) {
      const node = nodes[index]
      if (!node) continue
      if (node.kind === 'label') {
        const label = document.createElement('p')
        label.className = 'hall-group-label'
        label.textContent = node.text
        fragment.append(label)
      } else {
        const card = bookmarkCard(template, node.entry, onTag, boundTags)
        if (card) fragment.append(card)
      }
    }
    container.append(fragment)
    if (index < nodes.length) {
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

export function renderCards(
  container: HTMLElement,
  template: HTMLTemplateElement,
  entries: BookmarkEntry[],
  onTag: (tag: string) => void,
  boundTags: string[] = [],
): void {
  paintShelf(
    container,
    entries.map((entry) => ({ kind: 'card' as const, entry })),
    template,
    onTag,
    boundTags,
  )
}

export function renderGroupedCards(
  container: HTMLElement,
  template: HTMLTemplateElement,
  chunks: TagChunk[],
  onTag: (tag: string) => void,
  boundTags: string[] = [],
): void {
  const nodes: ShelfNode[] = []
  for (const chunk of chunks) {
    nodes.push({ kind: 'label', text: `${chunk.name} · ${String(chunk.entries.length)}` })
    for (const entry of chunk.entries) {
      nodes.push({ kind: 'card', entry })
    }
  }
  paintShelf(container, nodes, template, onTag, boundTags)
}

export function showPanel(container: HTMLElement, template: HTMLTemplateElement): HTMLElement {
  cancelShelfPaint(container)
  const node = template.content.firstElementChild
  if (!node) throw new Error('状态模板为空')
  const panel = node.cloneNode(true) as HTMLElement
  container.replaceChildren(panel)
  return panel
}
