export const PAPER_STORAGE_KEY = 'portal-paper'

export type PaperName = 'day' | 'night'

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
  const next = readPaper(options.storage) === 'day' ? 'night' : 'day'
  applyPaper(next, options)
  return next
}
