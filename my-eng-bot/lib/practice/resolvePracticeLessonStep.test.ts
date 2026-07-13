import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'

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
    expect(resolved!.exercise.correctAnswer).toBe('for')
    expect(resolved!.canonicalOptions).toEqual(['for', 'to', 'at'])
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
    expect(resolved!.exercise.correctAnswer).toBe("It's dark. It's time to sleep.")
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
    expect(resolved!.exercise.correctAnswer).toBe("It's")
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

  it('delegates reference free-response to resolveReferenceLessonStep', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 0,
      practiceType: 'free-response',
      mode: 'reference',
      referenceExerciseType: 'free-response',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.sourceStepNumber).toBe(4)
  })

  it('maps challenge listening-select step 9 to lesson step 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 8,
      practiceType: 'listening-select',
      mode: 'challenge',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.sourceStepNumber).toBe(1)
    expect(resolved!.exercise.correctAnswer).toBe("It's dark. It's time to sleep.")
  })

  it('delegates reference listening-select to resolveReferenceLessonStep', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const fromResolver = resolveReferenceLessonStep({
      lesson: lesson!,
      referenceExerciseType: 'listening-select',
      stepIndex: 0,
    })
    const fromPractice = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 0,
      practiceType: 'listening-select',
      mode: 'reference',
      referenceExerciseType: 'listening-select',
    })

    expect(fromPractice).toEqual(fromResolver)
    expect(fromPractice?.sourceStepNumber).toBe(1)
    expect(fromPractice?.exercise.correctAnswer).toBe("It's dark. It's time to sleep.")
  })
})
