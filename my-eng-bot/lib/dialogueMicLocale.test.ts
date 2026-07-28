import { describe, expect, it } from 'vitest'
import { resolveDialogueSttLang } from './dialogueMicLocale'

describe('resolveDialogueSttLang', () => {
  it('defaults to Whisper auto for dialogue mic', () => {
    expect(resolveDialogueSttLang()).toBe('auto')
    expect(resolveDialogueSttLang(null)).toBe('auto')
    expect(resolveDialogueSttLang(undefined)).toBe('auto')
  })

  it('respects one-shot forceNextMicLang', () => {
    expect(resolveDialogueSttLang('ru')).toBe('ru')
    expect(resolveDialogueSttLang('en')).toBe('en')
  })
})
