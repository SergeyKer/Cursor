import { describe, expect, it } from 'vitest'
import { buildTranslationErrorLexiconAndCyrillicLines } from './buildTranslationErrorLexiconAndCyrillicLines'

describe('buildTranslationErrorLexiconAndCyrillicLines', () => {
  it('возвращает строки нового формата при смешанном ответе', () => {
    const user = 'They usually plan поездки'
    const repeat = 'We usually plan trips in advance.'
    const lines = buildTranslationErrorLexiconAndCyrillicLines(user, repeat)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThanOrEqual(3)
    for (const line of lines) {
      expect(line.startsWith('- ')).toBe(true)
      expect(line).toContain('→')
      expect(line).toMatch(/^-\s+"[^"]+"\s+→\s+"[^"]+"(?:\s+\(.+\))?$/)
      expect(line).not.toMatch(/Лексика\s*:|Перевод\s*:|•/u)
    }
    expect(lines[0]).toContain('"поездки"')
    expect(lines[0]).toContain('переведи')
    expect(lines.join('\n')).not.toContain('english word')
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

  it('без кириллицы и без пар — возвращает fallback в новом формате', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines('Hello.', 'Hello.')
    expect(lines.length).toBe(1)
    expect(lines[0]).toMatch(/^-\s+"[^"]+"\s+→\s+"[^"]+"(?:\s+\(.+\))?$/)
  })

  it('для неполного перевода не использует generic wording fallback', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines('I cook', 'I cook a tasty dinner for my family.')
    const joined = lines.join('\n')
    expect(joined).toContain('перевод неполный')
    expect(joined).toContain('"I cook"')
    expect(joined).toContain('"I cook a tasty dinner for my family."')
    expect(joined).not.toContain('wording')
  })

  it('считает неполным префикс с одной slip-ошибкой числа', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines('I watch movie', 'I watch movies on weekends.')
    const joined = lines.join('\n')
    expect(joined).toContain('перевод неполный')
    expect(joined).not.toContain('wording')
  })

  it('хвостовая обрезка: ca → cat при эталоне', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines(
      'I like walking with my ca',
      'I like walking with my cat.'
    )
    const joined = lines.join('\n')
    expect(joined.toLowerCase()).toContain('ca')
    expect(joined.toLowerCase()).toContain('cat')
    expect(joined).toContain('опечат')
  })

  it('ограничивает количество строк до трех', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines(
      'Я люблю смотреть фильмы и иногда читаю книги',
      'I like watching movies and sometimes read books.'
    )
    expect(lines.length).toBeLessThanOrEqual(3)
  })

  it('переводит "каждый/каждои" в every по словарю и нормализации опечатки', () => {
    const base = buildTranslationErrorLexiconAndCyrillicLines(
      'I cook breakfast каждый day',
      'I cook breakfast every day.'
    )
    const typo = buildTranslationErrorLexiconAndCyrillicLines(
      'I cook breakfast каждои day',
      'I cook breakfast every day.'
    )
    expect(base.join('\n')).toContain('"каждый" → "every"')
    expect(typo.join('\n')).toContain('"каждои" → "every"')
    expect(base.join('\n')).not.toContain('english word')
    expect(typo.join('\n')).not.toContain('english word')
  })

  it('не подставляет вымышленный перевод для неуверенного слова', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines('I often drink кружка', 'I often drink from a mug.')
    const joined = lines.join('\n')
    expect(joined).toContain('"кружка"')
    expect(joined).toContain('"[перевод по контексту]"')
    expect(joined).toContain('переведи')
    expect(joined).not.toContain('слово не распознано уверенно')
    expect(joined).not.toContain('english word')
  })

  it('не сопоставляет Tomorreow с time при эталоне This time tomorrow', () => {
    const lines = buildTranslationErrorLexiconAndCyrillicLines(
      'Tomorreow I Will read books',
      'This time tomorrow, I will be reading a book.'
    )
    const joined = lines.join('\n').toLowerCase()
    expect(joined).toContain('"tomorreow"')
    expect(joined).toContain('"tomorrow"')
    expect(joined).not.toContain('→ "time"')
  })
})
