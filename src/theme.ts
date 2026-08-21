export const THEME_STORAGE_KEY = 'portal-theme'

export const THEMES = ['restrained', 'bold'] as const

export type ThemeName = (typeof THEMES)[number]

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return value === 'restrained' || value === 'bold'
}

export function readTheme(storage: Pick<Storage, 'getItem'> | null): ThemeName {
  if (!storage) return 'restrained'
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    return isThemeName(stored) ? stored : 'restrained'
  } catch {
    return 'restrained'
  }
}

export function nextTheme(theme: ThemeName): ThemeName {
  return theme === 'restrained' ? 'bold' : 'restrained'
}

export function themeLabel(theme: ThemeName): string {
  return theme === 'restrained' ? '克制' : '大胆'
}

type ThemeDocument = {
  documentElement: {
    dataset: DOMStringMap | Record<string, string>
    style: { colorScheme: string }
  }
}

export function applyTheme(
  theme: ThemeName,
  options: {
    document: ThemeDocument
    storage?: Pick<Storage, 'setItem'> | null
  },
): void {
  options.document.documentElement.dataset.theme = theme
  options.document.documentElement.style.colorScheme = 'light'
  if (!options.storage) return
  try {
    options.storage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Persistence is best-effort; a blocked store still applies the theme for this visit.
  }
}

export function toggleStoredTheme(options: {
  document: ThemeDocument
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
}): ThemeName {
  const current = readTheme(options.storage)
  const next = nextTheme(current)
  applyTheme(next, options)
  return next
}
