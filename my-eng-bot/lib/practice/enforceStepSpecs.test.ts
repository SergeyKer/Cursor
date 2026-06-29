import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { enforceStepSpecs } from '@/lib/practice/enforceStepSpecs'
import type { PracticeQuestion } from '@/types/practice'

describe('enforceStepSpecs', () => {
  it('applies semantic-near tier for speed-round when choice-like wrong count > 0', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const question: PracticeQuestion = {
      id: 'q10',
      lessonId: '1',
      type: 'speed-round',
      prompt: 'Pick fast',
      targetAnswer: "It's cold.",
      options: ["It's cold.", "It's colde.", "It's colds."],
      xpBase: 10,
      difficulty: 2,
      tolerance: 'strict',
    }

    const enforced = enforceStepSpecs([question], lesson!, 'challenge', 10, [{}], 1)
    expect(enforced[0]?.type).toBe('speed-round')
    expect(enforced[0]?.options).toBeDefined()
    expect(enforced[0]?.options).not.toEqual(question.options)
  })
})
