import { describe, expect, it } from 'vitest'
import {
  applyTranslationCommentCoachVoice,
  extractTranslationCommentBlock,
  inferTranslationCommentErrorType,
} from './translationCommentCoach'

describe('extractTranslationCommentBlock', () => {
  it('stops Комментарий before блока Ошибки', () => {
    const lines = ['Комментарий: Кратко.', 'Ошибки:', '🤔 тест', 'Время: Present Simple — факт.']
    const ex = extractTranslationCommentBlock(lines)
    expect(ex).not.toBeNull()
    expect(ex!.fullBody).toBe('Кратко.')
    expect(ex!.endExclusive).toBe(1)
  })

  it('merges Комментарий continuation lines until Время', () => {
    const lines = [
      'Комментарий: Ошибка времени: line one.',
      'Лексическая ошибка: dogs нужно заменить на cat.',
      'Время: Present Simple — факт.',
      'Повтори: I like my cat.',
    ]
    const ex = extractTranslationCommentBlock(lines)
    expect(ex).not.toBeNull()
    expect(ex!.fullBody).toContain('dogs')
    expect(ex!.fullBody).toContain('cat')
    expect(ex!.endExclusive).toBe(2)
  })
})

describe('inferTranslationCommentErrorType', () => {
  it('classifies sentence type mismatch', () => {
    expect(inferTranslationCommentErrorType('Ошибка типа предложения: нужен вопрос.')).toBe('Ошибка типа предложения.')
  })
})

describe('applyTranslationCommentCoachVoice', () => {
  it('does not insert school metaphor for present_simple', () => {
    const content = `Комментарий: Ошибка времени: нужно настоящее.
Время: Present Simple — факт.
Повтори: I like my cat.`
    const out = applyTranslationCommentCoachVoice({
      content,
      audience: 'adult',
      requiredTense: 'present_simple',
    })
    expect(out).not.toMatch(/школ/i)
    expect(out).toMatch(/Present Simple|настоящ/i)
  })

  it('preserves second reason line after coach prefix', () => {
    const content = `Комментарий: Ошибка времени: нужно настоящее.
Лексическая ошибка: dogs нужно заменить на cat.
Время: Present Simple — факт.
Повтори: I like my cat.`
    const out = applyTranslationCommentCoachVoice({
      content,
      audience: 'adult',
      requiredTense: 'present_simple',
    })
    expect(out.split('\n').some((l) => /dogs/i.test(l) && /cat/i.test(l))).toBe(true)
    expect(out).not.toMatch(/школ/i)
  })
})
