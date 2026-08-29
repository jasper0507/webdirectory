import {
  parseShelfQuery,
  searchEntries,
  type BookmarkEntry,
  type TagSummary,
} from './catalog.ts'

const QUESTION_LIST_LIMIT = 7

function fold(value: string): string {
  return value.normalize('NFC').toLowerCase()
}

type QuestionCatalog = {
  entries: BookmarkEntry[]
  tags: TagSummary[]
}

type QuestionRow =
  | { kind: 'tag'; tag: TagSummary }
  | { kind: 'title'; entry: BookmarkEntry }

export type QuestionAction =
  | { kind: 'open'; url: string }
  | { kind: 'shelf'; query: string }
  | { kind: 'tag'; tag: string }

function suggest(catalog: QuestionCatalog, input: string): QuestionRow[] {
  const needle = input.trim()
  if (!needle) return []
  const folded = fold(needle)
  const tags = catalog.tags.filter((tag) => fold(tag.name).includes(folded)).slice(0, 3)
  const titles = searchEntries(catalog.entries, parseShelfQuery(needle)).slice(
    0,
    QUESTION_LIST_LIMIT - tags.length,
  )
  return [
    ...tags.map((tag) => ({ kind: 'tag' as const, tag })),
    ...titles.map((entry) => ({ kind: 'title' as const, entry })),
  ]
}

function actionFor(rows: QuestionRow[], selectedIndex: number, query: string): QuestionAction {
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : undefined
  if (selected?.kind === 'tag') return { kind: 'tag', tag: selected.tag.name }
  if (selected?.kind === 'title') return { kind: 'open', url: selected.entry.url }
  return { kind: 'shelf', query: query.trim() }
}

function renderList(
  container: HTMLElement,
  rows: QuestionRow[],
  selectedIndex: number,
  applyAction: (action: QuestionAction) => void,
): void {
  if (rows.length === 0) {
    container.replaceChildren()
    container.hidden = true
    return
  }

  const ownerDocument = container.ownerDocument
  const fragment = ownerDocument.createDocumentFragment()
  const tags = rows.filter((row): row is Extract<QuestionRow, { kind: 'tag' }> => row.kind === 'tag')
  const titles = rows.filter(
    (row): row is Extract<QuestionRow, { kind: 'title' }> => row.kind === 'title',
  )
  if (tags.length > 0) {
    fragment.append(
      questionGroup(ownerDocument, '标签', tags.map((row, index) =>
        questionButton(
          ownerDocument,
          container.id,
          index,
          selectedIndex,
          row.tag.name,
          String(row.tag.count),
          () => applyAction({ kind: 'tag', tag: row.tag.name }),
        ),
      )),
    )
  }
  if (titles.length > 0) {
    fragment.append(
      questionGroup(ownerDocument, '题名', titles.map((row, index) => {
        const absoluteIndex = tags.length + index
        return questionButton(
          ownerDocument,
          container.id,
          absoluteIndex,
          selectedIndex,
          row.entry.title,
          row.entry.displayUrl,
          () => applyAction({ kind: 'open', url: row.entry.url }),
        )
      })),
    )
  }
  container.replaceChildren(fragment)
  container.hidden = false
}

function questionGroup(
  ownerDocument: Document,
  label: string,
  options: HTMLButtonElement[],
): HTMLDivElement {
  const group = ownerDocument.createElement('div')
  group.role = 'group'
  group.setAttribute('aria-label', label)
  const caption = ownerDocument.createElement('p')
  caption.className = 'hall-group-label'
  caption.textContent = label
  caption.setAttribute('aria-hidden', 'true')
  group.append(caption, ...options)
  return group
}

function questionButton(
  ownerDocument: Document,
  listId: string,
  index: number,
  selectedIndex: number,
  title: string,
  meta: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = ownerDocument.createElement('button')
  button.type = 'button'
  button.id = `${listId}-option-${String(index)}`
  button.role = 'option'
  button.tabIndex = -1
  button.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false')
  button.className = index === selectedIndex ? 'hall-item is-active' : 'hall-item'
  const name = ownerDocument.createElement('span')
  name.className = 'hall-item-title'
  name.textContent = title
  const aside = ownerDocument.createElement('span')
  aside.className = 'hall-item-meta'
  aside.textContent = meta
  button.append(name, aside)
  button.addEventListener('click', onClick)
  return button
}

export function wireQuestion(
  form: HTMLFormElement,
  getCatalog: () => QuestionCatalog | null,
  applyAction: (action: QuestionAction) => void,
): (value?: string) => void {
  const namedInput = form.elements.namedItem('q')
  if (!(namedInput instanceof HTMLInputElement)) throw new Error('提问表单缺少 input[name="q"]')
  const input: HTMLInputElement = namedInput

  const listId = input.getAttribute('aria-controls')
  const controlledList = listId ? form.ownerDocument.getElementById(listId) : null
  if (!controlledList || !form.contains(controlledList) || controlledList.getAttribute('role') !== 'listbox') {
    throw new Error('提问表单缺少 aria-controls 对应的 listbox')
  }
  const list: HTMLElement = controlledList
  const liveRegion = form.querySelector<HTMLElement>('[aria-live]')
  if (!liveRegion) throw new Error('提问表单缺少 aria-live 空态')
  const empty: HTMLElement = liveRegion
  let rows: QuestionRow[] = []
  let selectedIndex = -1

  function reset(value = ''): void {
    input.value = value
    rows = []
    selectedIndex = -1
    renderList(list, rows, selectedIndex, applyAction)
    empty.hidden = true
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
  }

  function paint(): void {
    const catalog = getCatalog()
    rows = catalog ? suggest(catalog, input.value) : []
    if (selectedIndex >= rows.length) selectedIndex = rows.length - 1
    renderList(list, rows, selectedIndex, applyAction)
    const asking = input.value.trim() !== ''
    const hasSuggestions = rows.length > 0
    empty.hidden = !catalog || !(asking && !hasSuggestions)
    input.setAttribute('aria-expanded', hasSuggestions ? 'true' : 'false')
    const selected = list.querySelector<HTMLElement>('[aria-selected="true"]')
    if (selected) input.setAttribute('aria-activedescendant', selected.id)
    else input.removeAttribute('aria-activedescendant')
  }

  input.addEventListener('input', () => {
    selectedIndex = -1
    paint()
  })

  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      if (selectedIndex >= 0) {
        selectedIndex = -1
        paint()
      } else if (input.value) {
        input.value = ''
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    } else if (event.key === 'ArrowDown' && rows.length > 0) {
      event.preventDefault()
      selectedIndex = Math.min(rows.length - 1, selectedIndex + 1)
      paint()
    } else if (event.key === 'ArrowUp' && rows.length > 0) {
      event.preventDefault()
      selectedIndex = Math.max(0, selectedIndex - 1)
      paint()
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault()
      applyAction(actionFor(rows, selectedIndex, input.value))
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    applyAction(actionFor(rows, -1, input.value))
  })

  return reset
}
