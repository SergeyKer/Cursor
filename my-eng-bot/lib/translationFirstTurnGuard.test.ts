import { describe, expect, it } from 'vitest'
import {
  applyTranslationFirstTurnContractGuard,
  splitRussianDrillSentenceUnits,
  validateTranslationFirstTurnPostInvite,
} from '@/lib/translationFirstTurnGuard'

describe('translationFirstTurnGuard', () => {
  it('passes для одного RU-предложения и приглашения', () => {
    const content = 'Я обычно читаю книги перед сном.\nПереведи на английский язык.'
    expect(validateTranslationFirstTurnPostInvite(content)).toEqual([])
  })

  it('fail при двух RU-предложениях в одном задании', () => {
    const content =
      'Я надеюсь, что вы хорошо проводите время с друзьями и семьей. Как давно вы поддерживаете связь с близкими.\nПереведи на английский язык.'
    expect(validateTranslationFirstTurnPostInvite(content)).toContain('multiple_ru_sentences')
  })

  it('fail без русского задания', () => {
    expect(validateTranslationFirstTurnPostInvite('Переведи на английский язык.')).toContain('missing_ru_task')
  })

  it('splitRussianDrillSentenceUnits считает два предложения', () => {
    const ru =
      'Я надеюсь, что вы хорошо проводите время с друзьями и семьей. Как давно вы поддерживаете связь с близкими.'
    expect(splitRussianDrillSentenceUnits(ru)).toHaveLength(2)
  })

  it('applyTranslationFirstTurnContractGuard подставляет fallback без LLM', () => {
    const bad =
      'Я надеюсь, что вы хорошо проводите время с друзьями и семьей. Как давно вы поддерживаете связь с близкими.\nПереведи на английский язык.'
    const r = applyTranslationFirstTurnContractGuard({
      content: bad,
      topic: 'family_friends',
      tense: 'present_perfect_continuous',
      level: 'b2',
      audience: 'adult',
      sentenceType: 'general',
      seedText: 'test-seed',
    })
    expect(r.replaced).toBe(true)
    expect(r.reasons).toContain('multiple_ru_sentences')
    expect(r.content).toContain('Переведи на английский язык.')
    expect(r.content).not.toContain('Я надеюсь')
    expect(splitRussianDrillSentenceUnits(r.content.split('\n')[0] ?? '')).toHaveLength(1)
  })
})
