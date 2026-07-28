import { describe, expect, it } from 'vitest'
import {
  filterByChoiceGranularity,
  hasMixedChoiceGranularity,
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
    expect(
      inferChoiceGranularity({
        targetAnswer: 'am',
        prompt: 'I ___ from Russia.',
      })
    ).toBe('word')
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

  it('keeps sentence granularity when gap marker conflicts with sentence target', () => {
    expect(
      inferChoiceGranularity({
        targetAnswer: 'I am from Russia.',
        prompt: "Ситуация: 'Я из России'. Как переведите: 'I ___ from Russia.'",
        answerFormat: 'full_sentence',
      })
    ).toBe('sentence')
    expect(
      inferChoiceGranularity({
        targetAnswer: 'I am from Russia.',
        prompt: 'I ___ from Russia.',
      })
    ).toBe('sentence')
  })

  it('filters mixed pools by granularity', () => {
    const mixed = ["It's dark.", 'drink', 'sleeps', "It's time to sleep."]
    expect(filterByChoiceGranularity(mixed, 'sentence')).toEqual(["It's dark.", "It's time to sleep."])
    expect(filterByChoiceGranularity(mixed, 'word')).toEqual(['drink', 'sleeps'])
  })

  it('detects mixed sentence and word options', () => {
    expect(hasMixedChoiceGranularity(['I am from Russia.', 'from', 'Russias'])).toBe(true)
    expect(hasMixedChoiceGranularity(['I am from Russia.', 'I from Russia.', 'I am from in Russia.'])).toBe(
      false
    )
    expect(hasMixedChoiceGranularity(['am', 'is', 'are'])).toBe(false)
  })

  it('detects complete sentences', () => {
    expect(isCompleteSentence("It's dark.")).toBe(true)
    expect(matchesChoiceGranularity('sleeps', 'word')).toBe(true)
    expect(matchesChoiceGranularity('sleeps', 'sentence')).toBe(false)
  })
})
