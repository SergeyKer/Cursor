import { describe, expect, it } from 'vitest'
import { buildSyntheticErrorsBlockFromComment } from './translationSyntheticErrorsBlock'

describe('buildSyntheticErrorsBlockFromComment', () => {
  it('returns null for praise-only comment', () => {
    expect(buildSyntheticErrorsBlockFromComment('Отлично! Всё верно.')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(buildSyntheticErrorsBlockFromComment('')).toBeNull()
  })

  it('builds lexical line and strips leading label', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      'Лексическая ошибка — используйте salad вместо «салат». Вы правильно использовали often.'
    )
    expect(out).toMatch(/^📖 Лексика:/)
    expect(out?.toLowerCase()).toContain('salad')
    expect(out?.toLowerCase()).not.toMatch(/^📖 лексика:\s*лексическая\s+ошибка/i)
  })

  it('maps time-related comment to grammar line (no Время inside Ошибки)', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      'Ошибка времени: здесь нужен Present Simple, потому что привычка.'
    )
    expect(out).toMatch(/^🔤 Грамматика:/)
    expect(out).not.toMatch(/^⏱️ Время:/)
  })

  it('uses grammar line for agreement wording', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      'Ошибка согласования подлежащего и сказуемого — проверьте has/have.'
    )
    expect(out).toMatch(/^🔤 Грамматика:/)
  })
})
