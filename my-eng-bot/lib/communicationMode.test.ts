import { describe, expect, it } from 'vitest'
import {
  buildCommunicationEnglishContinuationFallback,
  buildCommunicationFallbackMessage,
} from './communicationMode'

describe('communicationMode greetings by level', () => {
  it('builds simple first-turn EN greeting for A1', () => {
    const text = buildCommunicationFallbackMessage({
      audience: 'adult',
      language: 'en',
      level: 'a1',
      firstTurn: true,
      seedText: 'seed-a1',
    }).toLowerCase()

    expect(text).toContain('hello')
    expect(text).not.toMatch(/\bexplore\b|\bdiscuss\b|\bon your mind\b/)
  })

  it('keeps richer EN variants for B2+', () => {
    const text = buildCommunicationFallbackMessage({
      audience: 'adult',
      language: 'en',
      level: 'b2',
      firstTurn: true,
      seedText: 'seed-b2',
    }).toLowerCase()

    expect(text.length).toBeGreaterThan(20)
    expect(text).toContain('hello')
  })

  it('uses low-level continuation fallback without advanced verbs', () => {
    const text = buildCommunicationEnglishContinuationFallback('adult', 'a2').toLowerCase()
    expect(text).toContain('continue')
    expect(text).not.toContain('discuss')
  })
})
