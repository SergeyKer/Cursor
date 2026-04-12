import { describe, expect, it } from 'vitest'
import {
  extractSingleTranslationNextSentence,
  isTranslationNextRussianMetaInstruction,
  stripWrappingQuotesFromDrillRussianLine,
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

describe('stripWrappingQuotesFromDrillRussianLine', () => {
  it('убирает ASCII-кавычки и лишнюю точку после закрывающей кавычки', () => {
    expect(stripWrappingQuotesFromDrillRussianLine('"Я уже купил билеты на концерт.".')).toBe(
      'Я уже купил билеты на концерт.'
    )
  })

  it('убирает «ёлочки»', () => {
    expect(stripWrappingQuotesFromDrillRussianLine('«Я люблю кофе.»')).toBe('Я люблю кофе.')
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

  it('снимает кавычки с извлечённого предложения', () => {
    expect(
      extractSingleTranslationNextSentence(['Переведи далее: "Я уже купил билеты на концерт." .'])
    ).toBe('Я уже купил билеты на концерт.')
  })
})
