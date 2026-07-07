import { describe, expect, it } from 'vitest'
import { buildActivePracticeMenuSnapshot } from '@/lib/practice/buildActivePracticeMenuSnapshot'
import type { PracticeSession } from '@/types/practice'

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'practice-lesson-1',
    lessonId: 'lesson-1',
    topic: 'Test topic',
    level: 'A2',
    mode: 'reference',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: 'lesson-1' },
    status: 'active',
    questions: [
      {
        id: 'q1',
        lessonId: 'lesson-1',
        type: 'listening-select',
        prompt: 'Listen and choose',
        targetAnswer: 'A',
        acceptedAnswers: ['A'],
        xpBase: 10,
        difficulty: 2,
        tolerance: 'normalized',
      },
    ],
    currentIndex: 0,
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 1,
    ...overrides,
  }
}

describe('buildActivePracticeMenuSnapshot', () => {
  it('returns reference snapshot with exercise type from first question (#9 listening-select)', () => {
    const snapshot = buildActivePracticeMenuSnapshot(makeSession())

    expect(snapshot).toEqual({
      lessonId: 'lesson-1',
      mode: 'reference',
      referenceExerciseType: 'listening-select',
    })
  })

  it('returns challenge snapshot without referenceExerciseType', () => {
    const snapshot = buildActivePracticeMenuSnapshot(
      makeSession({
        mode: 'challenge',
        questions: [
          {
            ...makeSession().questions[0],
            type: 'choice',
          },
        ],
      })
    )

    expect(snapshot).toEqual({
      lessonId: 'lesson-1',
      mode: 'challenge',
      referenceExerciseType: undefined,
    })
  })

  it('returns null when session is not active', () => {
    expect(buildActivePracticeMenuSnapshot(makeSession({ status: 'completed' }))).toBeNull()
    expect(buildActivePracticeMenuSnapshot(null)).toBeNull()
    expect(buildActivePracticeMenuSnapshot(undefined)).toBeNull()
  })
})
