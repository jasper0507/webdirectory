import {
  groupEntriesByPrimaryTag,
  hallSuggestions,
  loadPortalSource,
  parseShelfQuery,
  queryIsEmpty,
  searchEntries,
  sevenWords,
  type Catalog,
} from './catalog.ts'
import { hallPath, parseRoute, shelfPath, type AppRoute } from './routes.ts'
import {
  applyPaper,
  paperLabel,
  readPaper,
  toggleStoredPaper,
  type PaperName,
} from './theme.ts'
import {
  cancelShelfPaint,
  fillIdentity,
  flattenHallRows,
  hallOptionId,
  renderCards,
  renderHallList,
  renderSevenWords,
  resolveHallSubmit,
  showPanel,
  type HallRow,
} from './ui.ts'

const SOURCE_URL = '/portal.json'

type AppUi = {
  hall: HTMLElement
  shelf: HTMLElement
  searchForm: HTMLFormElement
  search: HTMLInputElement
  hallList: HTMLElement
  hallEmpty: HTMLElement
  sevenWords: HTMLElement
  shelfForm: HTMLFormElement
  shelfSearch: HTMLInputElement
  shelfList: HTMLElement
  shelfEmpty: HTMLElement
  shelfCount: HTMLElement
  shelfStatus: HTMLElement
  results: HTMLElement
  cardTemplate: HTMLTemplateElement
  loadErrorTemplate: HTMLTemplateElement
  emptyCatalogTemplate: HTMLTemplateElement
  emptyFilterTemplate: HTMLTemplateElement
  liveNote: HTMLElement
}

let catalog: Catalog | null = null
let suggestRows: HallRow[] = []
let selectedSuggest = -1

function must<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector(selector)
  if (!node) throw new Error(`缺少界面节点：${selector}`)
  return node as T
}

function queryUi(): AppUi {
  return {
    hall: must(document, '#view-hall'),
    shelf: must(document, '#view-shelf'),
    searchForm: must(document, '#search-form'),
    search: must(document, '#q'),
    hallList: must(document, '#hall-list'),
    hallEmpty: must(document, '#hall-empty'),
    sevenWords: must(document, '#seven-words'),
    shelfForm: must(document, '#shelf-form'),
    shelfSearch: must(document, '#shelf-q'),
    shelfList: must(document, '#shelf-list'),
    shelfEmpty: must(document, '#shelf-empty'),
    shelfCount: must(document, '#shelf-count'),
    shelfStatus: must(document, '#shelf-status'),
    results: must(document, '#shelf-results'),
    cardTemplate: must(document, '#card-template'),
    loadErrorTemplate: must(document, '#state-load-error'),
    emptyCatalogTemplate: must(document, '#state-empty-catalog'),
    emptyFilterTemplate: must(document, '#state-empty-filter'),
    liveNote: must(document, '#live-note'),
  }
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function themeColor(paper: PaperName): string {
  return paper === 'night' ? '#1c1e22' : '#eef0f2'
}

function setPaperChrome(paper: PaperName, announce: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('[data-paper-toggle]').forEach((button) => {
    const next = paper === 'day' ? '夜间' : '白日'
    button.textContent = next
    button.setAttribute('aria-label', `切换到${next}纸`)
    button.title = `切换到${next}纸`
  })
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(paper))
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (icon) icon.href = paper === 'night' ? '/favicon-night.svg' : '/favicon.svg'
  document.documentElement.style.colorScheme = paper === 'night' ? 'dark' : 'light'
  if (announce) document.querySelector('#live-note')!.textContent = `已切换到${paperLabel(paper)}纸`
}

function paintStars(): void {
  const root = document.getElementById('stars')
  if (!root || root.childElementCount > 0) return
  for (let i = 0; i < 32; i += 1) {
    const star = document.createElement('span')
    star.className = 'star'
    star.style.left = `${String(Math.random() * 100)}%`
    star.style.top = `${String(Math.random() * 100)}%`
    star.style.setProperty('--dx', `${String((Math.random() * 80 - 20).toFixed(0))}px`)
    star.style.setProperty('--dy', `${String((-40 - Math.random() * 80).toFixed(0))}px`)
    star.style.setProperty('--dur', `${String((8 + Math.random() * 10).toFixed(1))}s`)
    star.style.setProperty('--delay', `${String((-Math.random() * 12).toFixed(1))}s`)
    root.append(star)
  }
}

function go(path: string): void {
  if (`${location.pathname}${location.search}` === path) {
    renderRoute(parseRoute(new URL(path, location.origin)))
    return
  }
  history.pushState({}, '', path)
  renderRoute(parseRoute(new URL(path, location.origin)))
}

function openEntry(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function applySubmit(action: ReturnType<typeof resolveHallSubmit>): void {
  if (action.kind === 'open') openEntry(action.url)
  else if (action.kind === 'tag') go(shelfPath('', [action.tag]))
  else go(shelfPath(action.query))
}

function setCombobox(input: HTMLInputElement, optionPrefix: string): void {
  const listOpen = suggestRows.length > 0
  input.setAttribute('aria-expanded', listOpen ? 'true' : 'false')
  if (listOpen && selectedSuggest >= 0) {
    input.setAttribute('aria-activedescendant', hallOptionId(selectedSuggest, optionPrefix))
  } else {
    input.removeAttribute('aria-activedescendant')
  }
}

function hideSuggest(list: HTMLElement, empty: HTMLElement, input: HTMLInputElement): void {
  suggestRows = []
  selectedSuggest = -1
  renderHallList(list, [], [], -1, () => undefined, () => undefined)
  empty.hidden = true
  input.setAttribute('aria-expanded', 'false')
  input.removeAttribute('aria-activedescendant')
}

function paintSuggest(
  input: HTMLInputElement,
  list: HTMLElement,
  empty: HTMLElement,
  optionPrefix: string,
): void {
  if (!catalog) {
    hideSuggest(list, empty, input)
    return
  }
  const asking = input.value.trim() !== ''
  const suggestions = asking
    ? hallSuggestions(catalog.entries, catalog.tags, input.value)
    : { tags: [], titles: [] }
  suggestRows = flattenHallRows(suggestions.tags, suggestions.titles)
  if (selectedSuggest >= suggestRows.length) selectedSuggest = suggestRows.length - 1
  renderHallList(
    list,
    suggestions.tags,
    suggestions.titles,
    selectedSuggest,
    (tag) => applySubmit({ kind: 'tag', tag }),
    (entry) => applySubmit({ kind: 'open', url: entry.url }),
    optionPrefix,
  )
  empty.hidden = !(asking && suggestRows.length === 0)
  setCombobox(input, optionPrefix)
}

function updateHallList(ui: AppUi): void {
  const asking = ui.search.value.trim() !== ''
  ui.hall.classList.toggle('is-asking', asking)
  ui.sevenWords.hidden = asking
  paintSuggest(ui.search, ui.hallList, ui.hallEmpty, 'hall-option')
}

function updateShelfList(ui: AppUi): void {
  paintSuggest(ui.shelfSearch, ui.shelfList, ui.shelfEmpty, 'shelf-option')
}

function handleSearchKeys(
  event: KeyboardEvent,
  input: HTMLInputElement,
  refresh: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (selectedSuggest >= 0) {
      selectedSuggest = -1
      refresh()
      return
    }
    if (input.value) {
      input.value = ''
      refresh()
    }
    return
  }
  if (event.key === 'ArrowDown' && suggestRows.length > 0) {
    event.preventDefault()
    selectedSuggest = Math.min(suggestRows.length - 1, selectedSuggest + 1)
    refresh()
  }
  if (event.key === 'ArrowUp' && suggestRows.length > 0) {
    event.preventDefault()
    selectedSuggest = Math.max(0, selectedSuggest - 1)
    refresh()
  }
  if (event.key === 'Enter' && selectedSuggest >= 0) {
    event.preventDefault()
    applySubmit(resolveHallSubmit(suggestRows, selectedSuggest, input.value))
  }
}

function setSkip(href: string): void {
  const skip = document.querySelector<HTMLAnchorElement>('.skip-link')
  if (skip) skip.setAttribute('href', href)
}

function clearShelfFailure(ui: AppUi): void {
  ui.shelf.classList.remove('is-failed')
  ui.shelfCount.hidden = false
  ui.shelfForm.hidden = false
}

function renderHall(ui: AppUi): void {
  cancelShelfPaint(ui.results)
  clearShelfFailure(ui)
  ui.hall.hidden = false
  ui.shelf.hidden = true
  setSkip('#q')
  document.getElementById('stars')?.removeAttribute('hidden')
  ui.search.value = ''
  selectedSuggest = -1
  ui.search.blur()
  hideSuggest(ui.shelfList, ui.shelfEmpty, ui.shelfSearch)
  if (!catalog) {
    updateHallList(ui)
    return
  }
  fillIdentity(document, catalog.identity)
  document.title = catalog.identity.wordmark
  ui.search.placeholder = catalog.identity.placeholder
  renderSevenWords(ui.sevenWords, sevenWords(catalog.tags), (tag) => applySubmit({ kind: 'tag', tag }))
  updateHallList(ui)
}

function renderShelfView(ui: AppUi, route: Extract<AppRoute, { name: 'shelf' }>): void {
  clearShelfFailure(ui)
  ui.hall.hidden = true
  ui.shelf.hidden = false
  setSkip('#shelf-q')
  document.getElementById('stars')?.setAttribute('hidden', '')
  if (!catalog) {
    showLoadError(ui, '读不到配置文件。')
    return
  }
  fillIdentity(document, catalog.identity)
  document.title = `${catalog.identity.wordmark} · 货架`
  ui.shelfSearch.value = route.query
  ui.shelfSearch.placeholder = catalog.identity.placeholder
  hideSuggest(ui.hallList, ui.hallEmpty, ui.search)
  hideSuggest(ui.shelfList, ui.shelfEmpty, ui.shelfSearch)

  const query = parseShelfQuery(route.query, route.tags)
  const entries = searchEntries(catalog.entries, query)
  ui.shelfCount.textContent = `${String(entries.length)} 个站点`
  const onTag = (tag: string) => applySubmit({ kind: 'tag', tag })

  if (catalog.entries.length === 0) {
    ui.shelfStatus.textContent = '书签目录为空'
    showPanel(ui.results, ui.emptyCatalogTemplate)
    return
  }

  if (entries.length === 0) {
    ui.shelfStatus.textContent = '找到 0 个站点'
    const panel = showPanel(ui.results, ui.emptyFilterTemplate)
    panel.querySelector('[data-show-all]')?.addEventListener('click', () => go(shelfPath()))
    return
  }

  const label = queryIsEmpty(query) ? '全部站点' : `找到 ${String(entries.length)} 个站点`
  ui.shelfStatus.textContent = label
  const ordered = queryIsEmpty(query)
    ? groupEntriesByPrimaryTag(entries).flatMap((chunk) => chunk.entries)
    : entries
  renderCards(ui.results, ui.cardTemplate, ordered, onTag, query.tags)
}

function renderRoute(route: AppRoute): void {
  const ui = queryUi()
  if (route.name === 'hall') renderHall(ui)
  else renderShelfView(ui, route)
}

function showLoadError(ui: AppUi, message: string): void {
  cancelShelfPaint(ui.results)
  ui.hall.hidden = true
  ui.shelf.hidden = false
  ui.shelf.classList.add('is-failed')
  ui.shelfCount.hidden = true
  ui.shelfForm.hidden = true
  ui.shelfStatus.textContent = message
  const panel = showPanel(ui.results, ui.loadErrorTemplate)
  const detail = panel.querySelector('[data-error-detail]')
  if (detail) detail.textContent = message
  const retry = panel.querySelector<HTMLButtonElement>('[data-retry]')
  if (retry) {
    retry.id = 'load-retry'
    retry.addEventListener('click', () => {
      void hydrate(ui)
    })
    setSkip('#load-retry')
  }
}

async function hydrate(ui: AppUi): Promise<void> {
  const result = await loadPortalSource(SOURCE_URL)
  if (result.status !== 'ok') {
    catalog = null
    showLoadError(ui, result.message)
    return
  }
  catalog = result.catalog
  renderRoute(parseRoute(new URL(location.href)))
}

function wire(ui: AppUi): void {
  const initialPaper = readPaper(storage())
  applyPaper(initialPaper, { document, storage: storage() })
  setPaperChrome(initialPaper, false)

  document.querySelectorAll('[data-paper-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = toggleStoredPaper({ document, storage: storage() })
      setPaperChrome(next, true)
    })
  })

  document.querySelectorAll('[data-home]').forEach((button) => {
    button.addEventListener('click', () => go(hallPath()))
  })

  ui.searchForm.addEventListener('submit', (event) => {
    event.preventDefault()
    applySubmit(resolveHallSubmit(suggestRows, -1, ui.search.value))
  })

  ui.search.addEventListener('input', () => {
    selectedSuggest = -1
    updateHallList(ui)
  })

  ui.search.addEventListener('keydown', (event) => {
    handleSearchKeys(event, ui.search, () => updateHallList(ui))
  })

  ui.shelfForm.addEventListener('submit', (event) => {
    event.preventDefault()
    applySubmit(resolveHallSubmit(suggestRows, -1, ui.shelfSearch.value))
  })

  ui.shelfSearch.addEventListener('input', () => {
    selectedSuggest = -1
    updateShelfList(ui)
  })

  ui.shelfSearch.addEventListener('keydown', (event) => {
    handleSearchKeys(event, ui.shelfSearch, () => updateShelfList(ui))
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target
    const tag = target instanceof HTMLElement ? target.tagName : ''
    const editable = tag === 'INPUT' || tag === 'TEXTAREA' || (target instanceof HTMLElement && target.isContentEditable)
    if (editable) return
    event.preventDefault()
    const route = parseRoute(new URL(location.href))
    if (route.name === 'hall') ui.search.focus()
    else ui.shelfSearch.focus()
  })

  window.addEventListener('popstate', () => {
    renderRoute(parseRoute(new URL(location.href)))
  })
}

export async function startApp(): Promise<void> {
  const ui = queryUi()
  paintStars()
  wire(ui)
  await hydrate(ui)
}
