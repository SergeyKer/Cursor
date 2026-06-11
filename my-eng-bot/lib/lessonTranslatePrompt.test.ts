import { describe, expect, it } from 'vitest'
import { formatTranslateQuestion, normalizeRuTranslatePhrase } from '@/lib/lessonTranslatePrompt'

describe('lessonTranslatePrompt', () => {
  it('wraps russian phrase in quotes without trailing punctuation', () => {
    expect(formatTranslateQuestion('Я из России.')).toBe('Переведите на английский: "Я из России"')
  })

  it('normalizes whitespace', () => {
    expect(normalizeRuTranslatePhrase('  Темно!  ')).toBe('Темно')
  })
})
