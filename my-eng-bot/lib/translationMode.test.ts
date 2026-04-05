import { describe, expect, it } from 'vitest'
import { normalizeTranslationPracticeSentence } from './translationMode'

describe('translationMode', () => {
  it('rewrites awkward time-of-day phrasing into natural Russian', () => {
    expect(normalizeTranslationPracticeSentence('Я люблю готовить разное время суток.')).toBe(
      'Я люблю готовить в разное время суток.'
    )
  })

  it('makes the English-at-home phrasing conversational', () => {
    expect(normalizeTranslationPracticeSentence('Мы обычно говорим по-английски дома.')).toBe(
      'Мы обычно разговариваем дома по-английски.'
    )
  })
})
