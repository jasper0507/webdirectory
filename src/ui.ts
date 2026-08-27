import {
  type BookmarkEntry,
  type SiteIdentity,
  type TagSummary,
} from './catalog.ts'

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
    button.role = 'listitem'
    button.textContent = tag.name
    button.addEventListener('click', () => onPick(tag.name))
    fragment.append(button)
  }
  container.replaceChildren(fragment)
}

export type HallRow =
  | { kind: 'tag'; tag: TagSummary }
  | { kind: 'title'; entry: BookmarkEntry }

export function flattenHallRows(tags: TagSummary[], titles: BookmarkEntry[]): HallRow[] {
  return [
    ...tags.map((tag) => ({ kind: 'tag' as const, tag })),
    ...titles.map((entry) => ({ kind: 'title' as const, entry })),
  ]
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
    const label = document.createElement('p')
    label.className = 'hall-group-label'
    label.textContent = '标签'
    fragment.append(label)
    tags.forEach((tag, index) => {
      fragment.append(hallButton('tag', index, selectedIndex, tag.name, String(tag.count), () => onTag(tag.name)))
    })
  }
  if (titles.length > 0) {
    const label = document.createElement('p')
    label.className = 'hall-group-label'
    label.textContent = '题名'
    fragment.append(label)
    titles.forEach((entry, index) => {
      const absolute = tags.length + index
      fragment.append(
        hallButton('title', absolute, selectedIndex, entry.title, entry.displayUrl, () => onTitle(entry)),
      )
    })
  }
  container.replaceChildren(fragment)
  container.hidden = false
  return rows
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
  button.className = index === selectedIndex ? 'hall-item is-active' : 'hall-item'
  button.dataset.kind = kind
  button.dataset.index = String(index)
  const name = document.createElement('span')
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
    fragment.append(constraintChip(`提问 · ${trimmed}`, onRemoveQuery))
  }
  for (const tag of tags) {
    fragment.append(constraintChip(tag, () => onRemoveTag(tag)))
  }
  container.replaceChildren(fragment)
  container.hidden = fragment.childNodes.length === 0
}

function constraintChip(label: string, onRemove: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'constraint-chip'
  button.append(document.createTextNode(label))
  const mark = document.createElement('span')
  mark.textContent = '×'
  mark.ariaHidden = 'true'
  button.append(mark)
  button.addEventListener('click', onRemove)
  return button
}

export function renderCooccur(
  container: HTMLElement,
  tags: TagSummary[],
  onPick: (tag: string) => void,
): void {
  const fragment = document.createDocumentFragment()
  for (const tag of tags) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'cooccur-chip'
    button.textContent = tag.name
    button.addEventListener('click', () => onPick(tag.name))
    fragment.append(button)
  }
  container.replaceChildren(fragment)
  container.hidden = tags.length === 0
}

export function renderCards(
  container: HTMLElement,
  template: HTMLTemplateElement,
  entries: BookmarkEntry[],
  onTag: (tag: string) => void,
): void {
  const fragment = document.createDocumentFragment()
  for (const entry of entries) {
    const node = template.content.firstElementChild
    if (!node) continue
    const card = node.cloneNode(true) as HTMLAnchorElement
    card.href = entry.url
    card.setAttribute('aria-label', `打开 ${entry.title}`)
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
        chip.className = 'card-tag'
        chip.textContent = tag
        chip.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          onTag(tag)
        })
        tags.append(chip)
      }
    }
    fragment.append(card)
  }
  container.replaceChildren(fragment)
}

export function showPanel(container: HTMLElement, template: HTMLTemplateElement): HTMLElement {
  const node = template.content.firstElementChild
  if (!node) throw new Error('状态模板为空')
  const panel = node.cloneNode(true) as HTMLElement
  container.replaceChildren(panel)
  return panel
}
