import { describe, expect, it } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'

const lessons = [itsTimeToLesson, whoLikesLesson]

describe('structured lesson 7-step contract', () => {
  it.each(lessons)('keeps original 7-step input methodology for lesson $id', (lesson) => {
    const step1 = lesson.steps[0]?.exercise
    const step2 = lesson.steps[1]?.exercise
    const step3 = lesson.steps[2]?.exercise
    const step4 = lesson.steps[3]?.exercise
    const step5 = lesson.steps[4]?.exercise
    const step6 = lesson.steps[5]?.exercise

    expect(step1?.type).toBe('fill_choice')
    expect(step2?.type).toBe('fill_choice')
    expect(step3?.type).toBe('fill_text')
    expect(step4?.type).toBe('translate')
    expect(step5?.type === 'translate' || step5?.type === 'write_own').toBe(true)
    expect(step6?.type).toBe('fill_choice')

    expect(step1?.options).toHaveLength(3)
    expect(step2?.options).toHaveLength(3)
    expect(step3?.options).toBeUndefined()
    expect(step4?.options).toBeUndefined()
    expect(step6?.options).toHaveLength(3)
    expect(step5?.options).toBeUndefined()

    expect(step3?.answerFormat).toBe('single_word')
    expect(step4?.answerFormat).toBe('full_sentence')
    expect(step5?.answerFormat).toBe('full_sentence')
  })

  it.each(lessons)('keeps text-only multi-variant practice on steps 3 and 4 for lesson $id', (lesson) => {
    for (const stepIndex of [2, 3]) {
      const exercise = lesson.steps[stepIndex]?.exercise
      const variants = exercise?.variants ?? []

      expect(variants.length).toBeGreaterThan(1)
      expect(variants.length).toBeLessThanOrEqual(3)

      for (const variant of variants) {
        expect(typeof variant.correctAnswer).toBe('string')
        expect(variant.correctAnswer.length).toBeGreaterThan(0)
        expect(variant.options).toBeUndefined()
      }
    }
  })
})
