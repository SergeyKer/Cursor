import { describe, expect, it } from 'vitest'
import { isExerciseCompatibleWithPracticeType } from '@/lib/practice/practiceStepCompatibility'

describe('isExerciseCompatibleWithPracticeType - word-builder-pro', () => {
  it('accepts sentence_puzzle only', () => {
    expect(
      isExerciseCompatibleWithPracticeType('word-builder-pro', {
        type: 'sentence_puzzle',
        correctAnswer: "It's time to go home.",
      })
    ).toBe(true)
  })

  it('rejects fill_choice (lesson step 7 gap-fill)', () => {
    expect(
      isExerciseCompatibleWithPracticeType('word-builder-pro', {
        type: 'fill_choice',
        options: ['dark', 'cold', 'late'],
        correctAnswer: 'dark',
      })
    ).toBe(false)
  })

  it('sentence-surgery also requires sentence_puzzle', () => {
    expect(
      isExerciseCompatibleWithPracticeType('sentence-surgery', {
        type: 'fill_choice',
        options: ['a', 'b'],
        correctAnswer: 'a',
      })
    ).toBe(false)
  })
})
