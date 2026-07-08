import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, isGlassTheme, isTheme, readStoredTheme, type Theme } from '@/lib/theme'

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

  it('detects glass themes', () => {
    expect(isGlassTheme('glass1')).toBe(true)
    expect(isGlassTheme('glass2')).toBe(true)
    expect(isGlassTheme('glass3')).toBe(true)
    expect(isGlassTheme('bubble2')).toBe(false)
    expect(isGlassTheme('basic')).toBe(false)
  })
})
