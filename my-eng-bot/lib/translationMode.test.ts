import { describe, expect, it } from 'vitest'
import {
  fallbackTranslationSentenceForContext,
  modelRussianDrillMismatchesPresentPerfectContinuous,
  normalizeDrillRuSentenceForSentenceType,
  normalizeTranslationPracticeSentence,
} from './translationMode'

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

    it('negates duration drill «уже несколько дней …» by inserting «не» before the verb, not before «несколько»', () => {
      expect(
        normalizeDrillRuSentenceForSentenceType(
          'Я уже несколько дней думаю о своей следующей поездке.',
          'negative'
        )
      ).toBe('Я уже несколько дней не думаю о своей следующей поездке.')
    })

    it('same duration rule for «Мы уже … дней»', () => {
      expect(normalizeDrillRuSentenceForSentenceType('Мы уже несколько дней готовим ужин дома.', 'negative')).toBe(
        'Мы уже несколько дней не готовим ужин дома.'
      )
    })

    it('does not mangle «Я уже несколько …» when there is no «дней» duration token (leaves text for other guards)', () => {
      const out = normalizeDrillRuSentenceForSentenceType('Я уже несколько фильмов посмотрел.', 'negative')
      expect(out).toBe('Я уже несколько фильмов посмотрел.')
    })

    it('generic «Я не …» does not produce «Я не уже» on «Я уже …» leftovers', () => {
      const out = normalizeDrillRuSentenceForSentenceType('Я уже много сделал дома.', 'negative')
      expect(out).not.toMatch(/Я не уже/i)
      expect(out).not.toMatch(/Я ещё не много/i)
      expect(out).toContain('Я уже')
    })
  })

  describe('fallbackTranslationSentenceForContext', () => {
    it('uses proper interrogative templates for present_perfect music (adult)', () => {
      const ru = fallbackTranslationSentenceForContext({
        topic: 'music',
        tense: 'present_perfect',
        level: 'b1',
        audience: 'adult',
        sentenceType: 'interrogative',
        seedText: 'adult-music-question',
      })

      expect(ru).toMatch(/\?\s*$/)
      expect(ru).toContain('Вы')
      expect(ru).not.toContain('Ты ')
      expect(ru).not.toMatch(/^Я .+\?$/)
    })

    it('uses child address register for present_perfect music interrogative', () => {
      const ru = fallbackTranslationSentenceForContext({
        topic: 'music',
        tense: 'present_perfect',
        level: 'a2',
        audience: 'child',
        sentenceType: 'interrogative',
        seedText: 'child-music-question',
      })

      expect(ru).toMatch(/\?\s*$/)
      expect(ru).toContain('Ты')
      expect(ru).not.toContain('Вы ')
    })

    it('keeps present_perfect declarative music prompts within the music topic', () => {
      const seeds = ['music-a', 'music-b', 'music-c', 'music-d', 'music-e', 'music-f', 'music-g']
      const allowed = new Set([
        'Я уже слышал эту песню много раз.',
        'Я уже был на живом концерте.',
        'Мы уже послушали новый альбом.',
      ])

      for (const seedText of seeds) {
        const ru = fallbackTranslationSentenceForContext({
          topic: 'music',
          tense: 'present_perfect',
          level: 'b2',
          audience: 'adult',
          sentenceType: 'general',
          seedText,
        })

        expect(allowed.has(ru)).toBe(true)
        expect(ru.toLowerCase()).not.toContain('домаш')
      }
    })

    it('keeps present_perfect negative music prompts within the music topic', () => {
      const seeds = ['music-neg-a', 'music-neg-b', 'music-neg-c', 'music-neg-d', 'music-neg-e']

      for (const seedText of seeds) {
        const ru = fallbackTranslationSentenceForContext({
          topic: 'music',
          tense: 'present_perfect',
          level: 'b2',
          audience: 'adult',
          sentenceType: 'negative',
          seedText,
        })

        expect(ru.toLowerCase()).toContain('не')
        expect(ru.toLowerCase()).not.toContain('домаш')
      }
    })
  })

  describe('modelRussianDrillMismatchesPresentPerfectContinuous', () => {
    it('true для результативного «уже + прош. сов.»', () => {
      expect(modelRussianDrillMismatchesPresentPerfectContinuous('Я уже прочитал эту книгу.')).toBe(true)
      expect(modelRussianDrillMismatchesPresentPerfectContinuous('Я уже изучил новую технику.')).toBe(true)
    })
    it('false для типичного PPC (давно / несколько часов + наст.)', () => {
      expect(modelRussianDrillMismatchesPresentPerfectContinuous('Я уже давно читаю эту книгу.')).toBe(false)
      expect(
        modelRussianDrillMismatchesPresentPerfectContinuous('Я уже несколько часов работаю над проектом.')
      ).toBe(false)
    })
  })
})
