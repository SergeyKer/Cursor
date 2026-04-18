import { describe, expect, it } from 'vitest'
import { buildTranslationTaskId, shouldEnterTranslationJunkFlow } from './translationCycleInvariant'

describe('translationCycleInvariant', () => {
  describe('buildTranslationTaskId', () => {
    it('returns stable id for same task with spacing and case differences', () => {
      const a = buildTranslationTaskId({
        ruPrompt: '  Я  люблю  кофе. ',
        tense: 'Present_Simple',
        level: 'A2',
        sentenceType: 'general',
        audience: 'adult',
      })
      const b = buildTranslationTaskId({
        ruPrompt: 'я люблю кофе.',
        tense: 'present_simple',
        level: 'a2',
        sentenceType: 'general',
        audience: 'adult',
      })
      expect(a).toBeTruthy()
      expect(a).toBe(b)
    })

    it('returns null when ru prompt is empty', () => {
      const id = buildTranslationTaskId({
        ruPrompt: '   ',
        tense: 'present_simple',
        level: 'a2',
        sentenceType: 'general',
        audience: 'adult',
      })
      expect(id).toBeNull()
    })
  })

  describe('shouldEnterTranslationJunkFlow', () => {
    it('allows error-cycle for short but english attempt', () => {
      const result = shouldEnterTranslationJunkFlow({
        userText: 'I go school',
        hasLatinLetters: true,
        hasCyrillicLetters: false,
        lowSignalInput: true,
        likelyLatinNoise: false,
        verdictReasons: [],
      })
      expect(result).toBe(false)
    })

    it('enters junk for whitelisted verdict reasons', () => {
      const result = shouldEnterTranslationJunkFlow({
        userText: 'abc',
        hasLatinLetters: true,
        hasCyrillicLetters: false,
        lowSignalInput: false,
        likelyLatinNoise: false,
        verdictReasons: ['gibberish_in_answer'],
      })
      expect(result).toBe(true)
    })

    it('enters junk for cyrillic-only input', () => {
      const result = shouldEnterTranslationJunkFlow({
        userText: 'я не знаю',
        hasLatinLetters: false,
        hasCyrillicLetters: true,
        lowSignalInput: false,
        likelyLatinNoise: false,
        verdictReasons: [],
      })
      expect(result).toBe(true)
    })
  })
})
