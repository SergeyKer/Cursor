import { describe, expect, it } from 'vitest'
import {
  buildCommunicationEnglishContinuationFallback,
  buildCommunicationFallbackMessage,
  buildCommunicationFirstMessage,
  buildCommunicationMaxTokens,
  extractCommunicationEnglishBody,
  isCannedCommunicationContinuation,
  isRecoverableCommunicationIntent,
  pickUsableCommunicationEnglish,
  shouldPreferEnglishContinuationFallback,
} from './communicationMode'

describe('communicationMode greetings by level', () => {
  it('builds A1 first message with RU warn + simple EN', () => {
    const text = buildCommunicationFirstMessage({
      audience: 'adult',
      level: 'a1',
      seedText: 'seed-a1',
    })
    expect(text).toMatch(/по-английски/)
    expect(text.toLowerCase()).toMatch(/hello|hi/)
    expect(text.toLowerCase()).not.toMatch(/\bexplore\b|\bon your mind\b/)
  })

  it('fallback first-turn EN uses the same first-message builder', () => {
    const text = buildCommunicationFallbackMessage({
      audience: 'child',
      language: 'en',
      level: 'a1',
      firstTurn: true,
      seedText: 'seed-child-a1',
    })
    expect(text).toMatch(/по-английски/)
    expect(text.toLowerCase()).not.toMatch(/\btopic\b/)
  })

  it('keeps B2 first message English-only', () => {
    const text = buildCommunicationFirstMessage({
      audience: 'adult',
      level: 'b2',
      seedText: 'seed-b2',
    })
    expect(text).not.toMatch(/[А-Яа-яЁё]/)
    expect(text.toLowerCase()).toMatch(/hello|hi/)
  })

  it('level all has no RU warn', () => {
    const text = buildCommunicationFirstMessage({
      audience: 'adult',
      level: 'all',
      seedText: 'seed-all',
    })
    expect(text).not.toMatch(/[А-Яа-яЁё]/)
  })

  it('uses low-level continuation fallback without advanced verbs', () => {
    const text = buildCommunicationEnglishContinuationFallback('adult', 'a2', 'seed-a2').toLowerCase()
    expect(text).toMatch(/start with|know first|talk about/)
    expect(text).not.toContain('discuss')
    expect(text).not.toContain('keep talking in english')
  })

  it('caps detail tokens tighter on A than on C', () => {
    const a = buildCommunicationMaxTokens(2, 1024, 'a1', 'child')
    const c = buildCommunicationMaxTokens(2, 1024, 'c1', 'adult')
    expect(a).toBeLessThan(c)
    expect(a).toBeLessThanOrEqual(420)
  })
})

describe('communication recoverable intent and continuation', () => {
  it('treats full Russian as recoverable EN continuation, not clarification', () => {
    expect(isRecoverableCommunicationIntent('Расскажи про Кремль')).toBe(true)
    expect(shouldPreferEnglishContinuationFallback('Расскажи про Кремль', 'en')).toBe(true)
    expect(buildCommunicationFallbackMessage({ audience: 'child', language: 'en' })).toMatch(
      /What do you mean/
    )
  })

  it('still prefers continuation for mix', () => {
    expect(shouldPreferEnglishContinuationFallback('I люблю маму', 'en')).toBe(true)
  })

  it('rejects empty and mash', () => {
    expect(isRecoverableCommunicationIntent('')).toBe(false)
    expect(isRecoverableCommunicationIntent('sdfghj')).toBe(false)
    expect(shouldPreferEnglishContinuationFallback('sdfghj', 'en')).toBe(false)
  })

  it('keeps English from a mixed model reply and drops canned continue', () => {
    expect(extractCommunicationEnglishBody('Солнце большое.\nThe sun is very bright. Do you like hot days?')).toMatch(
      /The sun is very bright/
    )
    expect(
      pickUsableCommunicationEnglish('The sun is very bright. Do you like hot days?'),
    ).toMatch(/sun/i)
    expect(
      isCannedCommunicationContinuation('Okay. Let’s keep talking in English. What part do you like most?'),
    ).toBe(true)
    expect(
      pickUsableCommunicationEnglish('Okay. Let’s keep talking in English. What part do you like most?'),
    ).toBe('')
  })
})
