import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  answerMatchesTarget,
  collectLessonChoicePool,
  collectLessonWideChoiceOptions,
  findLessonChoiceOptionsForTarget,
  resolveCanonicalChoiceOptions,
} from '@/lib/practice/lessonChoicePool'

describe('lessonChoicePool', () => {
  it('finds matched step options for target answer', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const target = lesson!.steps.find((s) => s.exercise?.correctAnswer)?.exercise?.correctAnswer
    expect(target).toBeTruthy()
    const matched = findLessonChoiceOptionsForTarget(lesson!, target!)
    expect(matched?.length).toBeGreaterThanOrEqual(2)
    expect(matched).toContain(target)
  })

  it('excludes target from lesson-wide pool', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const target = "It's cold."
    const wide = collectLessonWideChoiceOptions(lesson!, target)
    expect(wide.every((item) => !answerMatchesTarget(item, target))).toBe(true)
  })

  it('borrows sentence canonical trio for translate without options', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const translateStep = lesson!.steps.find((step) => step.exercise?.type === 'translate')
    expect(translateStep?.exercise).toBeTruthy()

    const canonical = resolveCanonicalChoiceOptions(
      lesson!,
      { ...translateStep!.exercise!, correctAnswer: "It's cold." },
      "It's cold."
    )

    expect(canonical).toEqual(["It's cold.", "It's time to sleep.", "It's time to drink."])
  })

  it('merges matched step and lesson-wide options', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()
    const stepWithOptions = lesson!.steps.find((s) => (s.exercise?.options?.length ?? 0) >= 2)
    expect(stepWithOptions?.exercise?.correctAnswer).toBeTruthy()
    const target = stepWithOptions!.exercise!.correctAnswer
    const pool = collectLessonChoicePool(lesson!, target)
    expect(pool.length).toBeGreaterThanOrEqual(2)
    expect(pool).toContain(target)
  })
})
