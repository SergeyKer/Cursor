import { describe, expect, it } from 'vitest'
import { buildPracticePuzzleExercise } from '@/lib/practice/buildPracticePuzzleExercise'
import type { PracticeQuestion } from '@/types/practice'

function baseQuestion(overrides: Partial<PracticeQuestion>): PracticeQuestion {
  return {
    id: 'lesson-1-5-sentence-surgery-3',
    lessonId: '1',
    type: 'sentence-surgery',
    prompt: 'Расставьте слова в правильном порядке.',
    targetAnswer: "It's time to go home.",
    acceptedAnswers: ["It's time to go home."],
    shuffledWords: ['go', 'home', "It's", 'time', 'to'],
    xpBase: 8,
    difficulty: 3,
    tolerance: 'strict',
    ...overrides,
  }
}

describe('buildPracticePuzzleExercise', () => {
  it('builds correctOrder from target and keeps traps out for sentence-surgery', () => {
    const exercise = buildPracticePuzzleExercise(baseQuestion({}))
    const variant = exercise.puzzleVariants?.[0]
    expect(variant?.correctOrder).toEqual(["It's", 'time', 'to', 'go', 'home'])
    expect(variant?.words).toEqual(['go', 'home', "It's", 'time', 'to'])
  })

  it('includes extra words in bank only for word-builder-pro', () => {
    const exercise = buildPracticePuzzleExercise(
      baseQuestion({
        type: 'word-builder-pro',
        extraWords: ['sleep'],
      })
    )
    const variant = exercise.puzzleVariants?.[0]
    expect(variant?.words).toContain('sleep')
    expect(variant?.correctOrder).not.toContain('sleep')
  })
})
