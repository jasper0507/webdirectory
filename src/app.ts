import { createIcons, Bookmark, CircleAlert, Search, SearchX } from 'lucide'
import {
  filterEntries,
  loadBookmarkSource,
  type BookmarkEntry,
  type Catalog,
} from './catalog.ts'
import {
  applyTheme,
  readTheme,
  themeLabel,
  toggleStoredTheme,
  type ThemeName,
} from './theme.ts'

const SOURCE_URL = '/bookmarks.json'
const BATCH_SIZE = 48
const FILTER_DELAY_MS = 80
const LUCIDE_ICONS = { Bookmark, CircleAlert, Search, SearchX }

type AppUi = {
  themeToggle: HTMLButtonElement
  themeNote: HTMLElement
  search: HTMLInputElement
  categories: HTMLElement
  status: HTMLElement
  results: HTMLElement
  statEntries: HTMLElement
  statCategories: HTMLElement
  cardTemplate: HTMLTemplateElement
  loadErrorTemplate: HTMLTemplateElement
  emptyCatalogTemplate: HTMLTemplateElement
  emptyFilterTemplate: HTMLTemplateElement
}

let catalog: Catalog = { entries: [], categories: [] }
let selectedCategory: string | null = null
let renderGeneration = 0
let filterTimer = 0

function must<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector(selector)
  if (!node) throw new Error(`缺少界面节点：${selector}`)
  return node as T
}

function queryUi(): AppUi {
  return {
    themeToggle: must(document, '#theme-toggle'),
    themeNote: must(document, '#theme-note'),
    search: must(document, '#catalog-search'),
    categories: must(document, '#categories'),
    status: must(document, '#result-status'),
    results: must(document, '#results'),
    statEntries: must(document, '#stat-entries'),
    statCategories: must(document, '#stat-categories'),
    cardTemplate: must(document, '#card-template'),
    loadErrorTemplate: must(document, '#state-load-error'),
    emptyCatalogTemplate: must(document, '#state-empty-catalog'),
    emptyFilterTemplate: must(document, '#state-empty-filter'),
  }
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function paintIcons(root: ParentNode = document): void {
  createIcons({
    icons: LUCIDE_ICONS,
    root: root instanceof HTMLElement ? root : document.body,
    attrs: { 'stroke-width': 1.75, 'aria-hidden': 'true' },
  })
}

function setThemeChrome(ui: AppUi, theme: ThemeName, announce: boolean): void {
  const current = themeLabel(theme)
  const next = themeLabel(theme === 'restrained' ? 'bold' : 'restrained')
  ui.themeToggle.setAttribute('aria-label', `当前为${current}主题，点击切换到${next}主题`)
  ui.themeToggle.setAttribute('title', `切换到${next}主题`)
  if (announce) ui.themeNote.textContent = `已切换到${current}主题`
}

function wireTheme(ui: AppUi): ThemeName {
  const initial = readTheme(storage())
  applyTheme(initial, { document, storage: storage() })
  setThemeChrome(ui, initial, false)
  ui.themeToggle.addEventListener('click', () => {
    const next = toggleStoredTheme({ document, storage: storage() })
    setThemeChrome(ui, next, true)
  })
  return initial
}

function setStats(ui: AppUi, entries: number, categories: number): void {
  ui.statEntries.textContent = String(entries)
  ui.statCategories.textContent = String(categories)
}

function setStatus(ui: AppUi, text: string): void {
  ui.status.textContent = text
}

function cloneTemplate(template: HTMLTemplateElement): HTMLElement {
  const node = template.content.firstElementChild
  if (!node) throw new Error('状态模板为空')
  return node.cloneNode(true) as HTMLElement
}

function showPanel(ui: AppUi, template: HTMLTemplateElement): HTMLElement {
  const panel = cloneTemplate(template)
  ui.results.replaceChildren(panel)
  paintIcons(panel)
  return panel
}

function cardNode(ui: AppUi, entry: BookmarkEntry): HTMLAnchorElement {
  const node = cloneTemplate(ui.cardTemplate) as HTMLAnchorElement
  node.href = entry.url
  node.setAttribute('aria-label', `打开 ${entry.title}`)
  must(node, '.card-title').textContent = entry.title
  const url = must<HTMLElement>(node, '.card-url')
  url.textContent = entry.displayUrl
  url.title = entry.url
  const description = must<HTMLElement>(node, '.card-desc')
  if (entry.description) {
    description.textContent = entry.description
    description.hidden = false
  } else {
    description.remove()
  }
  const category = must<HTMLElement>(node, '.card-category')
  if (entry.category) {
    category.textContent = entry.category
    category.hidden = false
  } else {
    category.remove()
  }
  return node
}

function renderCards(ui: AppUi, entries: BookmarkEntry[]): void {
  const generation = ++renderGeneration
  ui.results.replaceChildren()
  ui.results.setAttribute('aria-busy', 'true')
  let index = 0

  const pump = (): void => {
    if (generation !== renderGeneration) return
    const fragment = document.createDocumentFragment()
    const end = Math.min(index + BATCH_SIZE, entries.length)
    for (; index < end; index += 1) {
      const entry = entries[index]
      if (entry) fragment.append(cardNode(ui, entry))
    }
    ui.results.append(fragment)
    if (index < entries.length) {
      requestAnimationFrame(pump)
      return
    }
    ui.results.setAttribute('aria-busy', 'false')
  }

  pump()
}

function selectedCategoryFromUi(ui: AppUi): string | null {
  const checked = ui.categories.querySelector<HTMLInputElement>('input[type="radio"]:checked')
  const value = checked?.value ?? ''
  return value === '' ? null : value
}

function syncCategoryOverflow(ui: AppUi): void {
  const scroller = ui.categories
  const overflowing = scroller.scrollWidth - scroller.clientWidth > 2
  const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2
  scroller.classList.toggle('is-overflowing', overflowing)
  scroller.classList.toggle('is-at-end', atEnd)
}

function wireCategoryOverflow(ui: AppUi): void {
  const sync = () => syncCategoryOverflow(ui)
  ui.categories.addEventListener('scroll', sync, { passive: true })
  window.addEventListener('resize', sync)
}

function renderCategories(ui: AppUi): void {
  const previously = selectedCategory
  const fragment = document.createDocumentFragment()

  const appendChip = (label: string, value: string, count: number, checked: boolean): void => {
    const chip = document.createElement('label')
    chip.className = 'chip'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'category-filter'
    input.value = value
    input.checked = checked
    const face = document.createElement('span')
    face.className = 'chip-face'
    const name = document.createElement('span')
    name.className = 'chip-name'
    name.textContent = label
    const tally = document.createElement('span')
    tally.className = 'chip-count'
    tally.textContent = String(count)
    face.append(name, tally)
    chip.append(input, face)
    fragment.append(chip)
  }

  const stillExists = previously !== null && catalog.categories.some((item) => item.name === previously)
  selectedCategory = stillExists ? previously : null

  appendChip('全部', '', catalog.entries.length, selectedCategory === null)
  for (const item of catalog.categories) {
    appendChip(item.name, item.name, item.count, item.name === selectedCategory)
  }

  ui.categories.replaceChildren(fragment)
  syncCategoryOverflow(ui)
}

function currentEntries(ui: AppUi): BookmarkEntry[] {
  return filterEntries(catalog.entries, {
    query: ui.search.value,
    category: selectedCategory,
  })
}

function renderFiltered(ui: AppUi): void {
  const entries = currentEntries(ui)

  if (catalog.entries.length === 0) {
    setStatus(ui, '书签目录为空')
    showPanel(ui, ui.emptyCatalogTemplate)
    return
  }

  if (entries.length === 0) {
    const label = selectedCategory ? ` · ${selectedCategory}` : ''
    setStatus(ui, `找到 0 个站点${label}`)
    const panel = showPanel(ui, ui.emptyFilterTemplate)
    panel.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      ui.search.value = ''
      selectedCategory = null
      renderCategories(ui)
      renderFiltered(ui)
      ui.search.focus()
    })
    return
  }

  const label = selectedCategory ? ` · ${selectedCategory}` : ''
  setStatus(ui, `找到 ${String(entries.length)} 个站点${label}`)
  renderCards(ui, entries)
}

function scheduleFilter(ui: AppUi): void {
  window.clearTimeout(filterTimer)
  filterTimer = window.setTimeout(() => {
    selectedCategory = selectedCategoryFromUi(ui)
    renderFiltered(ui)
  }, FILTER_DELAY_MS)
}

function wireFilters(ui: AppUi): void {
  ui.search.form?.addEventListener('submit', (event) => {
    event.preventDefault()
    selectedCategory = selectedCategoryFromUi(ui)
    renderFiltered(ui)
  })
  ui.search.addEventListener('input', () => {
    scheduleFilter(ui)
  })
  ui.categories.addEventListener('change', () => {
    selectedCategory = selectedCategoryFromUi(ui)
    renderFiltered(ui)
  })
}

function showSkeletons(ui: AppUi): void {
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < 8; i += 1) {
    const skeleton = document.createElement('div')
    skeleton.className = 'bookmark-card skeleton-card'
    skeleton.setAttribute('aria-hidden', 'true')
    fragment.append(skeleton)
  }
  ui.results.replaceChildren(fragment)
}

async function hydrate(ui: AppUi): Promise<void> {
  ui.results.setAttribute('aria-busy', 'true')
  setStatus(ui, '正在读取书签源')
  showSkeletons(ui)
  const result = await loadBookmarkSource(SOURCE_URL)
  if (result.status !== 'ok') {
    catalog = { entries: [], categories: [] }
    setStats(ui, 0, 0)
    setStatus(ui, result.message)
    const panel = showPanel(ui, ui.loadErrorTemplate)
    const detail = panel.querySelector('[data-error-detail]')
    if (detail) detail.textContent = result.message
    panel.querySelector('[data-retry]')?.addEventListener('click', () => {
      void hydrate(ui)
    })
    ui.results.setAttribute('aria-busy', 'false')
    return
  }

  catalog = result.catalog
  setStats(ui, catalog.entries.length, catalog.categories.length)
  renderCategories(ui)
  renderFiltered(ui)
}

export async function startApp(): Promise<void> {
  const ui = queryUi()
  wireTheme(ui)
  wireFilters(ui)
  wireCategoryOverflow(ui)
  paintIcons()
  await hydrate(ui)
}
