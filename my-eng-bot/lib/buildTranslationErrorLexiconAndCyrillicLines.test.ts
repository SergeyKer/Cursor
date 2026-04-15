import { describe, expect, it } from 'vitest'
import {
  STATIC_TRANSLATION_LINE,
  buildTranslationErrorLexiconAndCyrillicLines,
} from './buildTranslationErrorLexiconAndCyrillicLines'

describe('buildTranslationErrorLexiconAndCyrillicLines', () => {
  it('строит Лексика + Перевод при смешанном ответе и эталоне', () => {
    const user = 'They usually plan поездки'
    const repeat = 'We usually plan trips in advance.'
    const lines = buildTranslationErrorLexiconAndCyrillicLines(user, repeat)
    expect(lines.some((l) => /Лексика\s*:/u.test(l))).toBe(true)
    expect(lines.some((l) => l.includes('поездки'))).toBe(true)
    expect(lines.some((l) => l.includes('Перевод:'))).toBe(true)
    expect(lines).toContain(STATIC_TRANSLATION_LINE)
  })

  it('подсказка love → like при эталоне с like', () => {
    const user = 'I love cooking pasta'
    const repeat = 'I like cooking pasta.'
    const lines = buildTranslationErrorLexiconAndCyrillicLines(user, repeat)
    const joined = lines.join('\n')
    expect(joined.toLowerCase()).toContain('love')
    expect(joined.toLowerCase()).toContain('like')
    expect(joined).toMatch(/для предпочтений/i)
  })

  it('без кириллицы и без пар — общая строка', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines('Hello.', 'Hello.')
    expect(lines.length).toBe(1)
    expect(lines[0]).toMatch(/Лексическ/i)
  })

  it('хвостовая обрезка: ca → cat при эталоне', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines(
      'I like walking with my ca',
      'I like walking with my cat.'
    )
    const joined = lines.join('\n')
    expect(joined.toLowerCase()).toContain('ca')
    expect(joined.toLowerCase()).toContain('cat')
    expect(joined).toMatch(/Лексика/i)
  })
})
