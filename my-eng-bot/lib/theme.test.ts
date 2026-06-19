import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, isTheme, readStoredTheme } from '@/lib/theme'

describe('theme', () => {
  it('defaults to bubble2', () => {
    expect(DEFAULT_THEME).toBe('bubble2')
  })

  it('validates theme ids', () => {
    expect(isTheme('bubble2')).toBe(true)
    expect(isTheme('basic')).toBe(true)
    expect(isTheme('unknown')).toBe(false)
  })

  it('readStoredTheme falls back to bubble2 without window storage', () => {
    expect(readStoredTheme()).toBe('bubble2')
  })
})
