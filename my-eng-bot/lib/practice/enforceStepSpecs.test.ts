import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { enforceStepSpecs } from '@/lib/practice/enforceStepSpecs'
import type { PracticeQuestion } from '@/types/practice'

describe('enforceStepSpecs', () => {
  it('keeps error-fix without choice options at challenge step 11', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const question: PracticeQuestion = {
      id: 'q10',
      lessonId: '1',
      type: 'error-fix',
      prompt: 'Ситуация: На улице темно. Исправьте: "It\'s cold."',
      targetAnswer: "It's dark.",
      acceptedAnswers: ["It's dark."],
      xpBase: 6,
      difficulty: 3,
      tolerance: 'normalized',
    }

    const enforced = enforceStepSpecs([question], lesson!, 'challenge', 10, [{}], 1)
    expect(enforced[0]?.type).toBe('error-fix')
    expect(enforced[0]?.options).toBeUndefined()
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
