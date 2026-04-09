import { describe, expect, it } from 'vitest'
import {
  extractSingleTranslationNextSentence,
  isTranslationNextRussianMetaInstruction,
} from './extractSingleTranslationNextSentence'

describe('isTranslationNextRussianMetaInstruction', () => {
  it('detects "Теперь давай поговорим…" framing', () => {
    expect(
      isTranslationNextRussianMetaInstruction('Теперь давай поговорим о твоем любимом времени года.')
    ).toBe(true)
  })

  it('detects "Давай поговорим" without Теперь', () => {
    expect(isTranslationNextRussianMetaInstruction('Давай поговорим о погоде.')).toBe(true)
  })

  it('allows normal drill sentences', () => {
    expect(isTranslationNextRussianMetaInstruction('Я обычно ем яичницу на завтрак.')).toBe(false)
    expect(isTranslationNextRussianMetaInstruction('Мое любимое время года — весна.')).toBe(false)
  })
})

describe('extractSingleTranslationNextSentence', () => {
  it('returns null for meta tutor line so server can use fallback', () => {
    expect(
      extractSingleTranslationNextSentence([
        'Теперь давай поговорим о твоем любимом времени года.',
      ])
    ).toBeNull()
  })

  it('still extracts sentence after standalone Теперь.', () => {
    const sentence = extractSingleTranslationNextSentence([
      'Теперь.',
      'Я люблю играть с друзьями по вечерам.',
    ])
    expect(sentence).toBe('Я люблю играть с друзьями по вечерам.')
  })
})
