import { describe, expect, it } from 'vitest'
import {
  buildDeterministicTranslationSupportRu,
  extractKommentariyPerevodBody,
  isBoilerplateTranslationSupportTemplate,
  isSafePreservedTranslationSupportBody,
} from './translationSupportFallback'

describe('translationSupportFallback', () => {
  it('детерминированная поддержка не совпадает с шаблоном «Есть хорошая основа, но…»', () => {
    const s = buildDeterministicTranslationSupportRu(
      'I like walking with my ca',
      'I like walking with my cat.',
      'adult'
    )
    expect(isBoilerplateTranslationSupportTemplate(s)).toBe(false)
    expect(s).toMatch(/walking/i)
    expect(s).toMatch(/Вы удачно/)
  })

  it('для ребёнка использует «Ты»', () => {
    const s = buildDeterministicTranslationSupportRu(
      'I like walking with my ca',
      'I like walking with my cat.',
      'child'
    )
    expect(s).toMatch(/Ты удачно/)
  })

  it('для incomplete режима возвращает прямой комментарий о неполном переводе', () => {
    const s = buildDeterministicTranslationSupportRu(
      'I cook',
      'I cook a tasty dinner for my family.',
      'adult',
      'incomplete'
    )
    expect(s).toMatch(/перевод пока неполный/i)
    expect(s).toMatch(/Хорошее начало/i)
  })

  it('extractKommentariyPerevodBody вытаскивает многострочную поддержку', () => {
    const raw = [
      'Комментарий_перевод: 💡 Первая строка.',
      'Вторая строка похвалы.',
      'Ошибки:',
      '🔤 Ошибка.',
      'Скажи: I run.',
    ].join('\n')
    expect(extractKommentariyPerevodBody(raw)).toContain('Первая строка')
    expect(extractKommentariyPerevodBody(raw)).toContain('Вторая строка')
  })

  it('isSafePreservedTranslationSupportBody отсекает диагностику', () => {
    expect(isSafePreservedTranslationSupportBody('Лексическая ошибка: cat.')).toBe(false)
    expect(isSafePreservedTranslationSupportBody('💡 Хорошая попытка.')).toBe(true)
  })
})
