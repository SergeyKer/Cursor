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

  it('reuses anchor targetAnswer for challenge roleplay at step 10', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const priorSessionPhrases = [
      { stepIndex: 4, type: 'free-response' as const, targetAnswer: "It's time to go.", prompt: 'Ситуация: test' },
    ]
    const question: PracticeQuestion = {
      id: 'q10',
      lessonId: '1',
      type: 'roleplay-mini',
      prompt: 'Собеседник: «Погода?»',
      targetAnswer: "It's cold.",
      acceptedAnswers: ["It's cold."],
      xpBase: 10,
      difficulty: 4,
      tolerance: 'soft',
      minWords: 2,
    }

    const enforced = enforceStepSpecs([question], lesson!, 'challenge', 9, [{}], undefined, priorSessionPhrases)
    expect(enforced[0]?.targetAnswer).toBe("It's time to go.")
    expect(enforced[0]?.prompt).toMatch(/Собеседник:/)
    expect(enforced[0]?.minWords).toBe(2)
  })
})
