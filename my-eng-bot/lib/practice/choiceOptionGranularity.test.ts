import { describe, expect, it } from 'vitest'
import {
  filterByChoiceGranularity,
  inferChoiceGranularity,
  isCompleteSentence,
  matchesChoiceGranularity,
} from '@/lib/practice/choiceOptionGranularity'

describe('choiceOptionGranularity', () => {
  it('infers word for gap-fill and single-word answers', () => {
    expect(
      inferChoiceGranularity({
        targetAnswer: 'drink',
        prompt: "It's time to ___ tea.",
        answerFormat: 'single_word',
      })
    ).toBe('word')
    expect(inferChoiceGranularity({ targetAnswer: 'dark', exerciseType: 'fill_choice' })).toBe('word')
  })

  it('infers sentence for full-sentence choice', () => {
    expect(
      inferChoiceGranularity({
        targetAnswer: "It's dark.",
        answerFormat: 'choice',
        exerciseType: 'fill_choice',
      })
    ).toBe('sentence')
  })

  it('filters mixed pools by granularity', () => {
    const mixed = ["It's dark.", 'drink', 'sleeps', "It's time to sleep."]
    expect(filterByChoiceGranularity(mixed, 'sentence')).toEqual(["It's dark.", "It's time to sleep."])
    expect(filterByChoiceGranularity(mixed, 'word')).toEqual(['drink', 'sleeps'])
  })

  it('detects complete sentences', () => {
    expect(isCompleteSentence("It's dark.")).toBe(true)
    expect(matchesChoiceGranularity('sleeps', 'word')).toBe(true)
    expect(matchesChoiceGranularity('sleeps', 'sentence')).toBe(false)
  })
})
