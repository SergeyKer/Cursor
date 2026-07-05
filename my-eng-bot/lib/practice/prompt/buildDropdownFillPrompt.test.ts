import { describe, expect, it } from 'vitest'
import {
  buildGapFillPrompt,
  isGapFillStylePrompt,
  parseLegacyTranslateGapQuestion,
  sanitizeDropdownHint,
} from '@/lib/practice/prompt/dropdownFillPromptFormat'

describe('dropdownFillPromptFormat', () => {
  it('builds canonical one-line gap fill prompt', () => {
    expect(buildGapFillPrompt('Я из России', 'I am from ___.')).toBe(
      'Выберите слово для пропуска: Я из России — «I am from ___.».'
    )
  })

  it('parses legacy translate gap question', () => {
    expect(
      parseLegacyTranslateGapQuestion(
        'Переведите на английский: "Я из России." - "I am from ___."'
      )
    ).toEqual({
      ruPhrase: 'Я из России',
      gapFrameEn: 'I am from ___.',
    })
  })

  it('detects gap fill style prompt', () => {
    const prompt = buildGapFillPrompt('Я из России', 'I am from ___.')
    expect(isGapFillStylePrompt(prompt)).toBe(true)
    expect(isGapFillStylePrompt('Ситуация: Я из России.')).toBe(false)
  })

  it('sanitizes write hints for dropdown', () => {
    expect(sanitizeDropdownHint('После from напишите одно английское слово.')).toBe(
      'После from одно английское слово.'
    )
  })
})
