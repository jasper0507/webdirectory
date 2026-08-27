export const PAPER_STORAGE_KEY = 'portal-paper'

export const PAPERS = ['day', 'night'] as const

export type PaperName = (typeof PAPERS)[number]

export function isPaperName(value: string | null | undefined): value is PaperName {
  return value === 'day' || value === 'night'
}

export function readPaper(storage: Pick<Storage, 'getItem'> | null): PaperName {
  if (!storage) return 'day'
  try {
    const stored = storage.getItem(PAPER_STORAGE_KEY)
    return isPaperName(stored) ? stored : 'day'
  } catch {
    return 'day'
  }
}

export function nextPaper(paper: PaperName): PaperName {
  return paper === 'day' ? 'night' : 'day'
}

export function paperLabel(paper: PaperName): string {
  return paper === 'day' ? '白日' : '夜间'
}

type PaperDocument = {
  documentElement: {
    dataset: DOMStringMap | Record<string, string>
    style: { colorScheme: string }
  }
}

export function applyPaper(
  paper: PaperName,
  options: {
    document: PaperDocument
    storage?: Pick<Storage, 'setItem'> | null
  },
): void {
  options.document.documentElement.dataset.paper = paper
  options.document.documentElement.style.colorScheme = paper === 'night' ? 'dark' : 'light'
  if (!options.storage) return
  try {
    options.storage.setItem(PAPER_STORAGE_KEY, paper)
  } catch {
    // Persistence is best-effort.
  }
}

export function toggleStoredPaper(options: {
  document: PaperDocument
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
}): PaperName {
  const next = nextPaper(readPaper(options.storage))
  applyPaper(next, options)
  return next
}
