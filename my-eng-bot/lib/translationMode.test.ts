import { describe, expect, it } from 'vitest'
import { normalizeDrillRuSentenceForSentenceType, normalizeTranslationPracticeSentence } from './translationMode'

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

  describe('normalizeDrillRuSentenceForSentenceType', () => {
    it('turns affirmative Russian into negative when menu type is negative', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Я люблю кофе.', 'negative')).toBe('Я не люблю кофе.')
    })

    it('forces interrogative punctuation when menu type is interrogative', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Я дома.', 'interrogative')).toBe('Я дома?')
    })

    it('strips question mark for general declarative', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Ты дома?', 'general')).toBe('Ты дома.')
    })

    it('leaves wording unchanged for mixed', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Я люблю кофе.', 'mixed')).toBe('Я люблю кофе.')
    })

    it('is idempotent for negative', () => {
      const once = normalizeDrillRuSentenceForSentenceType('Я люблю чай.', 'negative')
      expect(normalizeDrillRuSentenceForSentenceType(once, 'negative')).toBe(once)
    })
  })
})
