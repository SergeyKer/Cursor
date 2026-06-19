import { describe, expect, it } from 'vitest'
import {
  APP_SHELL_ERROR_COPY,
  APP_SHELL_HOME_COPY,
  getMenuGenerationFallbackMessage,
} from '@/lib/uiCopy/appShellCopy'

const CYRILLIC = /[А-Яа-яЁё]/
const PLACEHOLDER = /\?{3,}/

describe('appShellCopy', () => {
  it('home labels contain Cyrillic and no placeholder corruption', () => {
    for (const value of Object.values(APP_SHELL_HOME_COPY)) {
      expect(value).toMatch(CYRILLIC)
      expect(value).not.toMatch(PLACEHOLDER)
    }
  })

  it('error copy contains Cyrillic and no placeholder corruption', () => {
    expect(APP_SHELL_ERROR_COPY.errorFirstMessage).toMatch(CYRILLIC)
    expect(APP_SHELL_ERROR_COPY.emptyResponseFallback).toMatch(CYRILLIC)
    for (const msg of APP_SHELL_ERROR_COPY.retryMessages) {
      expect(msg).toMatch(CYRILLIC)
      expect(msg).not.toMatch(PLACEHOLDER)
    }
  })

  it('menu generation fallback messages are localized', () => {
    expect(getMenuGenerationFallbackMessage('provider')).toContain('модел')
    expect(getMenuGenerationFallbackMessage(undefined)).toContain('урок')
  })
})
