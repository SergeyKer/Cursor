import { describe, expect, it } from 'vitest'
import { buildContentFingerprint } from '@/lib/practice/buildContentFingerprint'
import type { PracticeSession } from '@/types/practice'

function sessionWithQuestion(id: string, prompt = 'Choose hello'): Pick<
  PracticeSession,
  'lessonId' | 'mode' | 'questions'
> {
  return {
    lessonId: 'topic-1',
    mode: 'balanced',
    questions: [
      {
        id,
        lessonId: 'topic-1',
        type: 'choice',
        prompt,
        targetAnswer: 'Hello',
        acceptedAnswers: ['Hello'],
        xpBase: 5,
        difficulty: 1,
        tolerance: 'normalized',
      },
    ],
  }
}

describe('buildContentFingerprint', () => {
  it('ignores unstable generated IDs but changes for different content', () => {
    expect(buildContentFingerprint(sessionWithQuestion('ai-random-1'))).toBe(
      buildContentFingerprint(sessionWithQuestion('ai-random-2'))
    )
    expect(buildContentFingerprint(sessionWithQuestion('ai-random-1'))).not.toBe(
      buildContentFingerprint(sessionWithQuestion('ai-random-1', 'Choose goodbye'))
    )
  })
})
