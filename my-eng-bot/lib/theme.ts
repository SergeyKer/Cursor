export type Theme = 'basic' | 'futuristic' | 'bubble1' | 'bubble2'

export const THEME_STORAGE_KEY = 'myeng_theme'

/** Тема по умолчанию — Bubble2 (стартовый экран и первый paint). */
export const DEFAULT_THEME: Theme = 'bubble2'

const THEMES: Theme[] = ['basic', 'futuristic', 'bubble1', 'bubble2']

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value)
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const savedValue = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(savedValue) ? savedValue : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}
