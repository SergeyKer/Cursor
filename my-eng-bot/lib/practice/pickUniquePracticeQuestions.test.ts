import { describe, expect, it } from 'vitest'
import type { PracticeQuestion } from '@/types/practice'
import { pickUniquePracticeQuestions } from '@/lib/practice/pickUniquePracticeQuestions'

function makeQuestion(id: string, prompt: string, targetAnswer: string): PracticeQuestion {
  return {
    id,
    lessonId: '1',
    type: 'voice-shadow',
    prompt,
    targetAnswer,
    acceptedAnswers: [targetAnswer],
    xpBase: 10,
    difficulty: 1,
    tolerance: 'soft',
  }
}

describe('pickUniquePracticeQuestions', () => {
  it('filters duplicate fingerprints from existing session questions', () => {
    const existing = [makeQuestion('q1', 'Say it.', "It's dark.")]
    const candidates = [
      makeQuestion('q2', 'Say it.', "It's dark."),
      makeQuestion('q3', 'New scenario.', "It's cold."),
    ]

    const fresh = pickUniquePracticeQuestions(candidates, existing)
    expect(fresh).toHaveLength(1)
    expect(fresh[0]?.id).toBe('q3')
  })
})
