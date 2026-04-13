import { describe, expect, it } from 'vitest'
import {
  buildSyntheticErrorsBlockFromComment,
  mergeErrorsBlockWithSyntheticFromComment,
} from './translationSyntheticErrorsBlock'

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

  it('strips short «Ошибка артикля» before synthetic grammar line', () => {
    const out = buildSyntheticErrorsBlockFromComment('Ошибка артикля: перед cat нужен a.')
    expect(out).toMatch(/^🔤 Грамматика:/)
    expect(out?.toLowerCase()).toContain('перед cat')
    expect(out?.toLowerCase()).not.toMatch(/^🔤 грамматика:\s*ошибка\s+артикл/i)
  })
})

describe('mergeErrorsBlockWithSyntheticFromComment', () => {
  it('appends synthetic line when payload already has Ошибки lines', () => {
    const payload = ['🔤 Грамматика: Пропусти опечатку.', '✏️ Орфография: ct → cat.'].join('\n')
    const comment = 'Ошибка артикля: перед cat нужен артикль a.'
    const out = mergeErrorsBlockWithSyntheticFromComment(payload, comment)
    expect(out).toContain('🔤 Грамматика: Пропусти')
    expect(out.toLowerCase()).toContain('артикл')
    expect(out.split('\n').length).toBeGreaterThanOrEqual(3)
  })

  it('does not duplicate when synthetic is already substring of payload', () => {
    const syn = buildSyntheticErrorsBlockFromComment('Ошибка артикля: перед cat нужен a.')!
    const out = mergeErrorsBlockWithSyntheticFromComment(syn, 'Ошибка артикля: перед cat нужен a.')
    expect(out).toBe(syn)
  })

  it('returns synthetic only when payload empty', () => {
    const comment = 'Ошибка артикля: нужен a.'
    const out = mergeErrorsBlockWithSyntheticFromComment('', comment)
    expect(out).toMatch(/^🔤 Грамматика:/)
    expect(out.toLowerCase()).toContain('a')
  })

  it('returns payload unchanged when comment is empty or praise-only', () => {
    expect(mergeErrorsBlockWithSyntheticFromComment('🔤 x', '')).toBe('🔤 x')
    expect(mergeErrorsBlockWithSyntheticFromComment('🔤 x', '   ')).toBe('🔤 x')
    expect(mergeErrorsBlockWithSyntheticFromComment('🔤 x', 'Отлично! Всё верно.')).toBe('🔤 x')
  })
})
