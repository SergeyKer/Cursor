import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'

describe('resolvePracticeLessonStep', () => {
  it('maps challenge context-clue step 3 to lesson gap-fill step', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 2,
      practiceType: 'context-clue',
      mode: 'challenge',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.sourceStepNumber).toBe(3)
    expect(resolved!.exercise.correctAnswer).toBe('drink')
    expect(resolved!.canonicalOptions).toEqual(['drink', 'sleeps', 'sleeping'])
  })

  it('maps challenge choice step 1 to lesson sentence choice', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 0,
      practiceType: 'choice',
      mode: 'challenge',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.sourceStepNumber).toBe(1)
    expect(resolved!.exercise.correctAnswer).toBe("It's dark.")
  })

  it('redirects balanced context-clue away from sentence_puzzle', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 4,
      practiceType: 'context-clue',
      mode: 'balanced',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.exercise.type).not.toBe('sentence_puzzle')
  })

  it('uses reference challenge step for context-clue #3', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 0,
      practiceType: 'context-clue',
      mode: 'reference',
      referenceExerciseType: 'context-clue',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.sourceStepNumber).toBe(3)
    expect(resolved!.exercise.correctAnswer).toBe('drink')
  })

  it('resolves lesson 2 without throwing', () => {
    const lesson = getStructuredLessonById('2')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 2,
      practiceType: 'context-clue',
      mode: 'challenge',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.exercise.type).not.toBe('sentence_puzzle')
  })

  it('resolves lesson 3 challenge steps without sentence_puzzle for context-clue', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()

    for (let practiceIndex = 0; practiceIndex < lesson!.steps.length; practiceIndex += 1) {
      const resolved = resolvePracticeLessonStep({
        lesson: lesson!,
        practiceIndex,
        practiceType: 'context-clue',
        mode: 'challenge',
      })

      expect(resolved).not.toBeNull()
      expect(resolved!.exercise.type).not.toBe('sentence_puzzle')
    }
  })
})
