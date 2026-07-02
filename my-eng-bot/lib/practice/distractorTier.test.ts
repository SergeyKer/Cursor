import { describe, expect, it } from 'vitest'
import { buildTieredChoiceOptions } from '@/lib/practice/distractorTier'
import { ensurePracticeChoiceOptions } from '@/lib/practice/ensurePracticeChoiceOptions'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'

describe('distractorTier', () => {  it('produces different option sets per tier', () => {
    const target = "It's cold."
    const obvious = buildTieredChoiceOptions(target, 'obvious')
    const semantic = buildTieredChoiceOptions(target, 'semantic-near')
    const minimal = buildTieredChoiceOptions(target, 'minimal-pair')
    expect(obvious.length).toBeGreaterThanOrEqual(3)
    expect(semantic.length).toBeGreaterThanOrEqual(3)
    expect(minimal.length).toBeGreaterThanOrEqual(3)
    expect(obvious).not.toEqual(semantic)
  })

  it('keeps backward compat without tier param', () => {
    const withDefault = ensurePracticeChoiceOptions(["It's cold."], "It's cold.")
    expect(withDefault).toHaveLength(3)
    expect(withDefault[0]).toBe("It's cold.")
  })

  it('prefers lesson pool over generic Tuesday fallback', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const target = lesson!.steps.find((s) => s.exercise?.correctAnswer)?.exercise?.correctAnswer
    expect(target).toBeTruthy()
    const pool = collectLessonChoicePool(lesson!, target!)
    const options = buildTieredChoiceOptions(target!, 'obvious', pool)
    expect(options).toContain(target)
    expect(options.some((item) => item === "It's Tuesday.")).toBe(false)
  })

  it('keeps lesson 1 dark choice free of single-word chips', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const target = "It's dark."
    const pool = collectLessonChoicePool(lesson!, target, { sourceStepNumber: 1, granularity: 'sentence' })
    const options = buildTieredChoiceOptions(target, 'obvious', pool, {
      granularity: 'sentence',
      canonicalOptions: ["It's dark.", "It's time to sleep.", "It's time to drink."],
      sourceStepOptionCount: 3,
    })
    expect(options).toHaveLength(3)
    expect(options.some((item) => item === 'sleeps' || item === 'sleeping')).toBe(false)
  })
})