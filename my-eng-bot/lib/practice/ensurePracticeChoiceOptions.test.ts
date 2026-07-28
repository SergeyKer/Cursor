import { describe, expect, it } from 'vitest'
import { isCompleteSentence } from '@/lib/practice/choiceOptionGranularity'
import {
  ensurePracticeChoiceOptions,
  PRACTICE_CHOICE_MIN_OPTIONS,
} from '@/lib/practice/ensurePracticeChoiceOptions'

describe('ensurePracticeChoiceOptions', () => {
  it('pads a lone correct answer to three chips', () => {
    const options = ensurePracticeChoiceOptions([], "It's cold.")
    expect(options).toHaveLength(PRACTICE_CHOICE_MIN_OPTIONS)
    expect(options[0]).toBe("It's cold.")
    expect(options).not.toContain("I don't know yet")
  })

  it('replaces idk soft-skip with pedagogical distractors', () => {
    const options = ensurePracticeChoiceOptions(["It's cold.", "I don't know yet"], "It's cold.")
    expect(options).toHaveLength(PRACTICE_CHOICE_MIN_OPTIONS)
    expect(options).not.toContain("I don't know yet")
    expect(options[0]).toBe("It's cold.")
  })

  it('keeps three distinct lesson options', () => {
    const lessonOptions = ["It's cold.", "It's time to study.", "It's time to eat."]
    const options = ensurePracticeChoiceOptions(lessonOptions, "It's cold.")
    expect(options).toEqual(lessonOptions)
  })

  it('adds time-to distractors for state answers', () => {
    const options = ensurePracticeChoiceOptions(["It's cold."], "It's cold.")
    expect(options.some((item) => /^It's time to /i.test(item))).toBe(true)
  })

  it('drops word distractors when target is a sentence (screenshot mix regression)', () => {
    const options = ensurePracticeChoiceOptions(
      ['I am from Russia.', 'from', 'Russias'],
      'I am from Russia.'
    )
    expect(options).toContain('I am from Russia.')
    expect(options.length).toBeGreaterThanOrEqual(PRACTICE_CHOICE_MIN_OPTIONS)
    expect(options.every((item) => isCompleteSentence(item))).toBe(true)
    expect(options).not.toContain('from')
    expect(options).not.toContain('Russias')
  })

  it('keeps single-word chips for word targets', () => {
    const options = ensurePracticeChoiceOptions(['am', 'from'], 'am')
    expect(options[0]).toBe('am')
    expect(options.length).toBeGreaterThanOrEqual(PRACTICE_CHOICE_MIN_OPTIONS)
    expect(options.every((item) => !isCompleteSentence(item))).toBe(true)
  })
})
