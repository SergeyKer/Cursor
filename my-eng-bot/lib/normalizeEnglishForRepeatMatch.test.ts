import { describe, expect, it } from 'vitest'
import { normalizeEnglishForRepeatMatch } from './normalizeEnglishForRepeatMatch'

describe('normalizeEnglishForRepeatMatch', () => {
  it('treats text book and textbook as equivalent form', () => {
    const a = normalizeEnglishForRepeatMatch('I use a textbook.')
    const b = normalizeEnglishForRepeatMatch('I use a text book.')
    expect(a).toBe(b)
    expect(a).toBe('i use a textbook')
  })

  it('does not merge unrelated bigrams', () => {
    const a = normalizeEnglishForRepeatMatch('I read a book.')
    const b = normalizeEnglishForRepeatMatch('I read book.')
    expect(a).not.toBe(b)
  })

  it('ignores final period, commas, and letter case for drill match', () => {
    const ref = normalizeEnglishForRepeatMatch('I cook pasta twice a week.')
    expect(ref).toBe(normalizeEnglishForRepeatMatch('i cook pasta twice a week'))
    expect(ref).toBe(normalizeEnglishForRepeatMatch('I cook pasta, twice a week'))
  })
})
