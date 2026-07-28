import { describe, expect, it } from 'vitest'
import {
  buildTranslationSoftFailAdvancePayload,
  extractTranslationSoftFailCommentBody,
  hasTranslationSoftFailMarker,
  isValidTranslationSoftFailAdvancePayload,
  pickTranslationSoftFailAdvanceComment,
} from './translationSoftFailAdvance'

describe('translationSoftFailAdvance', () => {
  it('detects marker and validates complete payload', () => {
    const payload = [
      'Комментарий_выход: Пока не попали — бывает. Засчитаем как ошибку и идём дальше.',
      'Переведи далее: Я читаю каждый день.',
    ].join('\n')
    expect(hasTranslationSoftFailMarker(payload)).toBe(true)
    expect(isValidTranslationSoftFailAdvancePayload(payload)).toBe(true)
    expect(extractTranslationSoftFailCommentBody(payload)).toMatch(/ошибк/i)
  })

  it('keeps soft-fail when bridge text contains ошибку', () => {
    const payload = [
      'Комментарий_выход: Засчитаем как ошибку и идём дальше.',
      'Переведи далее: Я люблю чай.',
    ].join('\n')
    expect(isValidTranslationSoftFailAdvancePayload(payload)).toBe(true)
  })

  it('rejects malformed payloads', () => {
    expect(isValidTranslationSoftFailAdvancePayload('Комментарий_выход: Мимо.')).toBe(false)
    expect(
      isValidTranslationSoftFailAdvancePayload(
        ['Комментарий_выход: Мимо.', 'Скажи: I read.', 'Переведи далее: Я читаю.'].join('\n')
      )
    ).toBe(false)
    expect(
      isValidTranslationSoftFailAdvancePayload(
        ['Комментарий_выход: Мимо.', 'Ошибки:', '- x', 'Переведи далее: Я читаю.'].join('\n')
      )
    ).toBe(false)
    expect(
      isValidTranslationSoftFailAdvancePayload(
        ['Комментарий_мусор: Нужен английский.', 'Переведи далее: Я читаю.'].join('\n')
      )
    ).toBe(false)
    expect(
      isValidTranslationSoftFailAdvancePayload(
        ['Комментарий_выход:   ', 'Переведи далее: Я читаю.'].join('\n')
      )
    ).toBe(false)
  })

  it('builder emits marker + next drill without Say', () => {
    const out = buildTranslationSoftFailAdvancePayload({
      seed: 'a|b|c',
      nextRu: 'Я читаю каждый день.',
      audience: 'adult',
    })
    expect(out).toMatch(/^Комментарий_выход:/m)
    expect(out).toContain('Переведи далее: Я читаю каждый день.')
    expect(out).not.toMatch(/Скажи\s*:/i)
    expect(isValidTranslationSoftFailAdvancePayload(out)).toBe(true)
  })

  it('picks child and adult comments from pools', () => {
    const adult = pickTranslationSoftFailAdvanceComment({ seed: 'x', audience: 'adult' })
    const child = pickTranslationSoftFailAdvanceComment({ seed: 'x', audience: 'child' })
    expect(adult.length).toBeGreaterThan(10)
    expect(child.length).toBeGreaterThan(10)
    expect(adult).not.toMatch(/^(Отлично|Хорошая|Молодец)/)
    expect(child).not.toMatch(/^(Отлично|Хорошая|Молодец)/)
  })
})
