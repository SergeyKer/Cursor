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

    it('turns "Мне нравится ..." into negative for negative sentenceType', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Мне нравится слушать музыку.', 'negative')).toBe(
        'Мне не нравится слушать музыку.'
      )
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

    it('keeps "Мне нравится ..." unchanged for mixed', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Мне нравится слушать музыку.', 'mixed')).toBe(
        'Мне нравится слушать музыку.'
      )
    })

    it('is idempotent for negative', () => {
      const once = normalizeDrillRuSentenceForSentenceType('Я люблю чай.', 'negative')
      expect(normalizeDrillRuSentenceForSentenceType(once, 'negative')).toBe(once)
    })

    it('does not treat "несколько" as built-in negation marker', () => {
      expect(
        normalizeDrillRuSentenceForSentenceType('Я уже посмотрел несколько хороших фильмов в этом месяце.', 'negative')
      ).toBe('Я ещё не посмотрел несколько хороших фильмов в этом месяце.')
    })
  })
})
