import { describe, expect, it } from 'vitest'
import {
  buildSyntheticErrorsBlockFromComment,
  dedupeTranslationErrorBlock,
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

  it('does not duplicate the same grammar pair with slightly different wording', () => {
    const payload = '🔤 Грамматика: you → your.\n✏️ Орфография: homework.'
    const comment = 'Ошибка времени и you → your.'
    const out = mergeErrorsBlockWithSyntheticFromComment(payload, comment)
    expect(out).toBe(payload)
  })

  it('dedupes semantically overlapping grammar lines in the final error block', () => {
    const body = [
      '🔤 Грамматика: "sister" требует артикль "a" перед ним — "a sister".',
      '🔤 Грамматика: Ошибка формы: добавь "a" перед "sister" в предложении.',
      '📖 Лексика: sister is the right word.',
    ].join('\n')
    const out = dedupeTranslationErrorBlock(body)
    expect(out.split('\n')).toHaveLength(2)
    expect(out).toContain('a sister')
    expect(out).toContain('📖 Лексика:')
  })

  it('dedupes article-focused lines with different wording', () => {
    const body = [
      '🔤 Грамматика: перед sister нужен артикль a.',
      '🔤 Грамматика: "sister" требует "a" перед ним.',
    ].join('\n')
    const out = dedupeTranslationErrorBlock(body)
    expect(out.split('\n')).toHaveLength(1)
    expect(out.toLowerCase()).toContain('sister')
  })

  it('labels loose correction examples inside error block', () => {
    const body = ['- "watck" -> "watch"', '🔤 Грамматика: Ошибка формы глагола.'].join('\n')
    const out = dedupeTranslationErrorBlock(body)
    expect(out).toMatch(/^🔤 Грамматика:/)
    expect(out).not.toMatch(/^- /m)
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
