import { describe, expect, it } from 'vitest'
import { translationDotClassName, TRANSLATION_BUTTON_DOT_BG } from './TranslationButtonDot'

describe('translationDotClassName', () => {
  it('returns fixed hex classes independent of theme tokens', () => {
    expect(translationDotClassName('ready')).toBe(TRANSLATION_BUTTON_DOT_BG.ready)
    expect(translationDotClassName('loading')).toBe('bg-[#ea580c]')
    expect(translationDotClassName('error')).toBe('bg-[#ef4444]')
    expect(translationDotClassName('idle')).toBe('bg-[#94a3b8]')
  })

  it('does not reference status or theme css variables', () => {
    for (const state of ['ready', 'loading', 'error', 'idle'] as const) {
      const cls = translationDotClassName(state)
      expect(cls).not.toContain('var(--status')
      expect(cls).not.toContain('var(--engvo-translate')
      expect(cls).not.toContain('bubble2')
    }
  })
})
