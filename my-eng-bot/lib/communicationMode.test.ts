import { describe, expect, it } from 'vitest'
import {
  buildCommunicationEnglishContinuationFallback,
  buildCommunicationFallbackMessage,
  buildCommunicationFirstMessage,
  buildCommunicationMaxTokens,
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
    const text = buildCommunicationEnglishContinuationFallback('adult', 'a2').toLowerCase()
    expect(text).toContain('continue')
    expect(text).not.toContain('discuss')
  })

  it('caps detail tokens tighter on A than on C', () => {
    const a = buildCommunicationMaxTokens(2, 1024, 'a1', 'child')
    const c = buildCommunicationMaxTokens(2, 1024, 'c1', 'adult')
    expect(a).toBeLessThan(c)
    expect(a).toBeLessThanOrEqual(420)
  })
})
