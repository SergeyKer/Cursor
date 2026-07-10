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

  it('allows cyrillic phrases in Ru voice mode', () => {
    expect(canShowLanguageNoteInfo('Как дела сегодня', { voiceMode: 'ru' })).toBe(true)
    expect(canShowLanguageNoteInfo('привет', { voiceMode: 'ru' })).toBe(false)
    expect(canShowLanguageNoteInfo('Как дела сегодня', { voiceMode: 'en' })).toBe(false)
    expect(canShowLanguageNoteInfo('превет как your doings', { voiceMode: 'mix' })).toBe(true)
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
    expect(
      shouldShowLanguageNoteMark({
        mode: 'dialogue',
        engvoVoiceMode: true,
        content: 'I like music',
        callInProgress: true,
      })
    ).toBe(false)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'dialogue',
        engvoVoiceMode: true,
        content: 'I like music',
        callInProgress: false,
      })
    ).toBe(true)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'communication',
        engvoVoiceMode: false,
        content: 'Как дела сегодня вечером',
        communicationVoiceInputMode: 'ru',
      })
    ).toBe(true)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'communication',
        engvoVoiceMode: false,
        content: 'Как дела сегодня вечером',
        communicationVoiceInputMode: 'en',
      })
    ).toBe(false)
  })

  it('truncates long input to 500 chars', () => {
    const long = `A ${'word '.repeat(200)}`
    expect(truncateLanguageNoteInput(long).length).toBeLessThanOrEqual(500)
  })
})
