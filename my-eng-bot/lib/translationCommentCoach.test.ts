import { describe, expect, it } from 'vitest'
import {
  applyTranslationCommentCoachVoice,
  extractTranslationCommentBlock,
  inferTranslationCommentErrorType,
  injectSentenceTypePopravImperative,
  stripTranslationCommentLabel,
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
      'Скажи: I like my cat.',
    ]
    const ex = extractTranslationCommentBlock(lines)
    expect(ex).not.toBeNull()
    expect(ex!.fullBody).toContain('dogs')
    expect(ex!.fullBody).toContain('cat')
    expect(ex!.endExclusive).toBe(2)
  })

  it('legacy «Комментарий_ошибка:» всё ещё распознаётся как блок комментария', () => {
    const lines = ['Комментарий_ошибка: Нужен другой порядок слов.', 'Ошибки:', '🔤 …']
    const ex = extractTranslationCommentBlock(lines)
    expect(ex).not.toBeNull()
    expect(ex!.fullBody).toBe('Нужен другой порядок слов.')
    expect(stripTranslationCommentLabel('Комментарий_ошибка: Нужен другой порядок слов.')).toBe(
      'Нужен другой порядок слов.'
    )
  })
})

describe('inferTranslationCommentErrorType', () => {
  it('classifies sentence type mismatch', () => {
    expect(inferTranslationCommentErrorType('Ошибка типа предложения: нужен вопрос.')).toBe('Ошибка типа предложения.')
  })

  it('не путает опечатку с ошибкой формы глагола, если в тексте есть spelling', () => {
    expect(
      inferTranslationCommentErrorType(
        "Ошибка формы глагола. Правильное spelling: 'studying' вместо 'studing'."
      )
    ).toBe('Орфографическая ошибка.')
  })

  it('классифициет подсказку «рус. → eng» как ошибку перевода, а не тип предложения', () => {
    expect(inferTranslationCommentErrorType("Ошибка типа предложения. Нужно использовать форму 'cooking' вместо 'готовлю'.")).toBe(
      'Ошибка перевода.'
    )
    expect(inferTranslationCommentErrorType("'готовлю' → 'cooking'")).toBe('Ошибка перевода.')
  })
})

describe('injectSentenceTypePopravImperative', () => {
  it('вставляет «Поправьте» перед «вопрос должен» для взрослой аудитории', () => {
    const raw = '🔤 Ошибка типа предложения. Вопрос должен быть в Present Continuous.'
    const out = injectSentenceTypePopravImperative(raw, 'adult')
    expect(out).toBe('🔤 Ошибка типа предложения. Поправьте — Вопрос должен быть в Present Continuous.')
  })

  it('вставляет «Поправь» для ребёнка', () => {
    const raw = 'Комментарий: Ошибка типа предложения: вопрос должен стоять первым.'
    const out = injectSentenceTypePopravImperative(raw, 'child')
    expect(out).toBe('Комментарий: Ошибка типа предложения: Поправь — вопрос должен стоять первым.')
  })

  it('не дублирует, если императив уже есть', () => {
    const raw = '🔤 Ошибка типа предложения. Поправь — вопрос должен быть так.'
    expect(injectSentenceTypePopravImperative(raw, 'child')).toBe(raw)
  })
})

describe('applyTranslationCommentCoachVoice', () => {
  it('does not insert school metaphor for present_simple', () => {
    const content = `Комментарий: Ошибка времени: нужно настоящее.
Время: Present Simple — факт.
Скажи: I like my cat.`
    const out = applyTranslationCommentCoachVoice({
      content,
      audience: 'adult',
      requiredTense: 'present_simple',
    })
    expect(out).not.toMatch(/школ/i)
    expect(out).toMatch(/Время:\s*Present Simple/)
    const kom = out.split(/\r?\n/).find((l) => /^Комментарий\s*:/i.test(l)) ?? ''
    expect(kom).not.toMatch(/Present Simple/i)
  })

  it('preserves second reason line after coach prefix', () => {
    const content = `Комментарий: Ошибка времени: нужно настоящее.
Лексическая ошибка: dogs нужно заменить на cat.
Время: Present Simple — факт.
Скажи: I like my cat.`
    const out = applyTranslationCommentCoachVoice({
      content,
      audience: 'adult',
      requiredTense: 'present_simple',
    })
    expect(out.split('\n').some((l) => /dogs/i.test(l) && /cat/i.test(l))).toBe(true)
    expect(out).not.toMatch(/школ/i)
  })
})
