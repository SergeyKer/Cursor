import { describe, expect, it } from 'vitest'
import {
  canShowLanguageNoteInfo,
  shouldShowLanguageNoteMark,
  truncateLanguageNoteInput,
} from '@/lib/languageNote/eligibility'

describe('languageNote eligibility', () => {
  it('allows latin learner phrases', () => {
    expect(canShowLanguageNoteInfo('I like drive byke')).toBe(true)
    expect(canShowLanguageNoteInfo('previous work')).toBe(true)
  })

  it('hides russian-only, empty, emoji-only and stop tokens', () => {
    expect(canShowLanguageNoteInfo('Привет')).toBe(false)
    expect(canShowLanguageNoteInfo('')).toBe(false)
    expect(canShowLanguageNoteInfo('😂😂')).toBe(false)
    expect(canShowLanguageNoteInfo('ok')).toBe(false)
    expect(canShowLanguageNoteInfo('yes')).toBe(false)
    expect(canShowLanguageNoteInfo('haha')).toBe(false)
  })

  it('gates mark by mode and engvo', () => {
    expect(
      shouldShowLanguageNoteMark({
        mode: 'communication',
        engvoVoiceMode: false,
        content: 'I like music',
      })
    ).toBe(true)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'dialogue',
        engvoVoiceMode: true,
        content: 'I like music',
      })
    ).toBe(true)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'dialogue',
        engvoVoiceMode: false,
        content: 'I like music',
      })
    ).toBe(false)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'translation',
        engvoVoiceMode: false,
        content: 'I like music',
      })
    ).toBe(false)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'communication',
        engvoVoiceMode: false,
        content: 'ok',
      })
    ).toBe(false)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'communication',
        engvoVoiceMode: true,
        content: 'I like music',
        isEngvoServiceLine: true,
      })
    ).toBe(false)
  })

  it('truncates long input to 500 chars', () => {
    const long = `A ${'word '.repeat(200)}`
    expect(truncateLanguageNoteInput(long).length).toBeLessThanOrEqual(500)
  })
})
