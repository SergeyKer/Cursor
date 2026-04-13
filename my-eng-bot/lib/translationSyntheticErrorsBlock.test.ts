import { describe, expect, it } from 'vitest'
import {
  buildSyntheticErrorsBlockFromComment,
  dedupeTranslationErrorBlock,
  extractTranslationErrorSynthAndPraiseFromComment,
  mergeErrorsBlockWithSyntheticFromComment,
  partitionEncouragementLinesFromTranslationErrorsPayload,
  sanitizeTranslationPayloadContinuousErrors,
  stripConflictingContinuousTenseErrorLines,
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
    expect(out).toMatch(/^📖 /)
    expect(out?.toLowerCase()).toContain('salad')
    expect(out?.toLowerCase()).not.toMatch(/^📖 лексика:\s*лексическая\s+ошибка/i)
  })

  it('maps time-related comment to grammar line (no Время inside Ошибки)', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      'Ошибка времени: здесь нужен Present Simple, потому что привычка.'
    )
    expect(out).toMatch(/^🔤 /)
    expect(out).not.toMatch(/^⏱️ Время:/)
  })

  it('uses grammar line for agreement wording', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      'Ошибка согласования подлежащего и сказуемого — проверьте has/have.'
    )
    expect(out).toMatch(/^🔤 /)
  })

  it('strips short «Ошибка артикля» before synthetic grammar line', () => {
    const out = buildSyntheticErrorsBlockFromComment('Ошибка артикля: перед cat нужен a.')
    expect(out).toMatch(/^🔤 /)
    expect(out?.toLowerCase()).toContain('перед cat')
    expect(out?.toLowerCase()).not.toMatch(/^🔤\s*ошибка\s+артикл/i)
  })

  it('при «spelling» убирает ложную метку «Ошибка формы глагола» и даёт строку ✏️', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      "Ошибка формы глагола. Правильное spelling: 'studying' вместо 'studing'."
    )
    expect(out).toMatch(/^✏️ /)
    expect(out?.toLowerCase()).not.toMatch(/ошибка\s+формы\s+глагола/i)
    expect(out?.toLowerCase()).toContain('studying')
  })

  it('при ошибке перевода снимает ложную метку «Ошибка типа предложения»', () => {
    const out = buildSyntheticErrorsBlockFromComment(
      "Ошибка типа предложения. Нужно использовать форму 'cooking' вместо 'готовлю'."
    )
    expect(out).toMatch(/^📖 /)
    expect(out?.toLowerCase()).not.toMatch(/ошибка\s+типа\s+предложения/i)
    expect(out?.toLowerCase()).toContain('cooking')
  })
})

describe('extractTranslationErrorSynthAndPraiseFromComment', () => {
  it('отделяет похвалу «Вижу, что…» от синтетической строки ошибки', () => {
    const comment =
      "Ошибка перевода — замените 'фильмы' на 'movies'. Вижу, что вы правильно использовали 'I like to watch'."
    const { synthetic, praiseFromComment } = extractTranslationErrorSynthAndPraiseFromComment(comment)
    expect(synthetic?.toLowerCase()).toContain('фильмы')
    expect(synthetic?.toLowerCase()).toContain('movies')
    expect(synthetic?.toLowerCase()).not.toMatch(/вижу/i)
    expect(praiseFromComment?.toLowerCase()).toMatch(/вижу/)
  })
})

describe('partitionEncouragementLinesFromTranslationErrorsPayload', () => {
  it('убирает из «Ошибки» строку, начинающуюся с похвалы после эмодзи', () => {
    const raw = ["📖 'фильмы' → 'movies'", '🔤 Вижу, что вы правильно использовали конструкцию.'].join('\n')
    const { errorsRest, praiseFromErrors } = partitionEncouragementLinesFromTranslationErrorsPayload(raw)
    expect(errorsRest).toContain('фильмы')
    expect(errorsRest.toLowerCase()).not.toMatch(/вижу/)
    expect(praiseFromErrors?.toLowerCase()).toMatch(/вижу/)
  })
})

describe('mergeErrorsBlockWithSyntheticFromComment', () => {
  it('appends synthetic line when payload already has Ошибки lines', () => {
    const payload = ['🔤 Пропусти опечатку.', '✏️ ct → cat.'].join('\n')
    const comment = 'Ошибка артикля: перед cat нужен артикль a.'
    const out = mergeErrorsBlockWithSyntheticFromComment(payload, comment)
    expect(out).toContain('🔤 Пропусти')
    expect(out.toLowerCase()).toContain('артикл')
    expect(out.split('\n').length).toBeGreaterThanOrEqual(3)
  })

  it('does not duplicate when synthetic is already substring of payload', () => {
    const syn = buildSyntheticErrorsBlockFromComment('Ошибка артикля: перед cat нужен a.')!
    const out = mergeErrorsBlockWithSyntheticFromComment(syn, 'Ошибка артикля: перед cat нужен a.')
    expect(out).toBe(syn)
  })

  it('does not duplicate the same grammar pair with slightly different wording', () => {
    const payload = '🔤 you → your.\n✏️ homework.'
    const comment = 'Ошибка времени и you → your.'
    const out = mergeErrorsBlockWithSyntheticFromComment(payload, comment)
    expect(out).toBe(payload)
  })

  it('dedupes semantically overlapping grammar lines in the final error block', () => {
    const body = [
      '🔤 "sister" требует артикль "a" перед ним — "a sister".',
      '🔤 Ошибка формы: добавь "a" перед "sister" в предложении.',
      '📖 sister is the right word.',
    ].join('\n')
    const out = dedupeTranslationErrorBlock(body)
    expect(out.split('\n')).toHaveLength(2)
    expect(out).toContain('a sister')
    expect(out).toContain('📖 sister')
  })

  it('dedupes article-focused lines with different wording', () => {
    const body = [
      '🔤 перед sister нужен артикль a.',
      '🔤 "sister" требует "a" перед ним.',
    ].join('\n')
    const out = dedupeTranslationErrorBlock(body)
    expect(out.split('\n')).toHaveLength(1)
    expect(out.toLowerCase()).toContain('sister')
  })

  it('labels loose correction examples inside error block', () => {
    const body = ['- "watck" -> "watch"', '🔤 Ошибка формы глагола.'].join('\n')
    const out = dedupeTranslationErrorBlock(body)
    expect(out.split('\n')[0]).toMatch(/^🔤 /)
    expect(out).not.toMatch(/^- /m)
  })

  it('returns synthetic only when payload empty', () => {
    const comment = 'Ошибка артикля: нужен a.'
    const out = mergeErrorsBlockWithSyntheticFromComment('', comment)
    expect(out).toMatch(/^🔤 /)
    expect(out.toLowerCase()).toContain('a')
  })

  it('returns payload unchanged when comment is empty or praise-only', () => {
    expect(mergeErrorsBlockWithSyntheticFromComment('🔤 x', '')).toBe('🔤 x')
    expect(mergeErrorsBlockWithSyntheticFromComment('🔤 x', '   ')).toBe('🔤 x')
    expect(mergeErrorsBlockWithSyntheticFromComment('🔤 x', 'Отлично! Всё верно.')).toBe('🔤 x')
  })
})

describe('stripConflictingContinuousTenseErrorLines', () => {
  const repeat = 'I have been learning English recently.'
  it('removes V3 / third-form time error lines for present_perfect_continuous', () => {
    const body = [
      "🔤 'learning' → 'learned'",
      '🔤 Ошибка времени. Необходимо использовать правильную форму глагола learn в третьей форме (V3).',
      '📖 давно → recently',
    ].join('\n')
    const out = stripConflictingContinuousTenseErrorLines(body, 'present_perfect_continuous', repeat)
    expect(out).toContain('давно')
    expect(out).not.toMatch(/learning.*learned/i)
    expect(out.toLowerCase()).not.toMatch(/треть.*форм/i)
    expect(out.toLowerCase()).not.toMatch(/\bv3\b/i)
  })

  it('does not strip unrelated lines for continuous tense', () => {
    const body = '🔤 В вопросе нужен have перед you.'
    const out = stripConflictingContinuousTenseErrorLines(body, 'present_perfect_continuous', repeat)
    expect(out).toBe(body)
  })

  it('leaves errors unchanged for non-continuous tense', () => {
    const body = "🔤 'learning' → 'learned'\n🔤 Ошибка времени — нужен V3."
    const out = stripConflictingContinuousTenseErrorLines(body, 'present_perfect', repeat)
    expect(out).toBe(body)
  })
})

describe('sanitizeTranslationPayloadContinuousErrors', () => {
  it('splices Ошибки block in full assistant payload', () => {
    const content = [
      'Комментарий_перевод: 💡 Тест.',
      'Комментарий: Ошибка.',
      'Ошибки:',
      "🔤 'learning' → 'learned'",
      '🔤 Ошибка времени: используйте V3.',
      'Время: Present Perfect Continuous — длительность.',
      'Повтори: I have been learning English recently.',
    ].join('\n')
    const out = sanitizeTranslationPayloadContinuousErrors(
      content,
      'present_perfect_continuous',
      'I have been learning English recently.'
    )
    expect(out).toContain('Повтори:')
    expect(out.toLowerCase()).not.toMatch(/\bv3\b/)
    expect(out).not.toMatch(/learning.*learned/i)
  })
})
