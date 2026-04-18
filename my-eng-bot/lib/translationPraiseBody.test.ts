import { describe, expect, it } from 'vitest'
import {
  extractTranslationDrillPlainCommentBody,
  translationDrillCommentBodyLooksLikePraise,
} from './translationPraiseBody'

describe('translationDrillCommentBodyLooksLikePraise', () => {
  it('узнаёт контекстную похвалу (Круто / Замечаю)', () => {
    expect(translationDrillCommentBodyLooksLikePraise('Круто, что ты правильно использовал отрицание.')).toBe(true)
    expect(translationDrillCommentBodyLooksLikePraise('Замечаю, что вы правильно использовали структуру.')).toBe(
      true
    )
  })
  it('отсекает коррекцию', () => {
    expect(translationDrillCommentBodyLooksLikePraise('Ошибка времени: нужен Present Perfect.')).toBe(false)
  })
})

describe('extractTranslationDrillPlainCommentBody', () => {
  it('собирает многострочный комментарий до Переведи далее', () => {
    const raw = [
      'Комментарий: Круто, что ты правильно',
      'использовал конструкцию.',
      'Переведи далее: Я читаю.',
    ].join('\n')
    expect(extractTranslationDrillPlainCommentBody(raw)).toContain('Круто')
    expect(extractTranslationDrillPlainCommentBody(raw)).toContain('использовал')
  })
})
