import { describe, expect, it } from 'vitest'
import { hasTranslationPromptUserKeywordMismatch } from './translationPromptUserCoverage'

describe('hasTranslationPromptUserKeywordMismatch', () => {
  it('неполный перевод: нет «отпуск / vacation» — mismatch', () => {
    const ru = 'Я люблю путешествовать в отпуске.'
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'I like to travel')).toBe(true)
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'I love to travel')).toBe(true)
  })

  it('полный смысл: love + travel + vacation/holiday', () => {
    const ru = 'Я люблю путешествовать в отпуске.'
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'I love to travel on vacation.')).toBe(false)
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'I love travelling on holiday.')).toBe(false)
  })

  it('like вместо love при полном хвосте — допустимо (контроль смысла через travel + vacation)', () => {
    const ru = 'Я люблю путешествовать в отпуске.'
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'I like to travel on vacation.')).toBe(false)
  })

  it('много смысловых русских слов, но почти нет в словаре — не засчитываем ответ по одному ключу', () => {
    const ru = 'Я абсолютно точно согласен с этим мнением полностью.'
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'I agree with you completely.')).toBe(true)
  })

  it('латинский мусор при RU с содержанием — mismatch (запасной гейт)', () => {
    const ru = 'У тебя есть сестра.'
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'sdffs')).toBe(true)
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'dkknsaldohva')).toBe(true)
  })

  it('нормальный английский перевод — нет shape-mismatch', () => {
    const ru = 'У тебя есть сестра.'
    expect(hasTranslationPromptUserKeywordMismatch(ru, 'You have a sister.')).toBe(false)
  })
})
