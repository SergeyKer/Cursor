import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, isTheme, readStoredTheme, type Theme } from '@/lib/theme'

const ALL_THEMES: Theme[] = [
  'basic',
  'futuristic',
  'bubble1',
  'bubble2',
  'glass1',
  'glass2',
  'glass3',
]

describe('theme', () => {
  it('defaults to bubble2', () => {
    expect(DEFAULT_THEME).toBe('bubble2')
  })

  it('validates all theme ids including glass', () => {
    for (const themeId of ALL_THEMES) {
      expect(isTheme(themeId)).toBe(true)
    }
    expect(isTheme('unknown')).toBe(false)
    expect(isTheme('glass')).toBe(false)
  })

  it('readStoredTheme falls back to bubble2 without window storage', () => {
    expect(readStoredTheme()).toBe('bubble2')
  })
})
