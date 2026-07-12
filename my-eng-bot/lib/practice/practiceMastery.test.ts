import { describe, expect, it } from 'vitest'
import { computePracticeMasterySnapshot } from '@/lib/practice/practiceMastery'
import type { PracticeAnswer, PracticeQuestion, PracticeSession } from '@/types/practice'

function q(id: string, xpBase = 10): PracticeQuestion {
  return {
    id,
    lessonId: 'l1',
    type: 'choice',
    prompt: 'p',
    targetAnswer: 'a',
    acceptedAnswers: ['a'],
    xpBase,
    difficulty: 1,
    tolerance: 'strict',
  }
}

function ans(
  questionId: string,
  opts: Partial<PracticeAnswer> & Pick<PracticeAnswer, 'isCorrect' | 'corrected'>
): PracticeAnswer {
  return {
    questionId,
    userAnswer: 'x',
    correctAnswer: 'a',
    xpEarned: 0,
    responseTimeMs: 1,
    timestamp: 1,
    ...opts,
  }
}

function session(partial: Partial<PracticeSession> & Pick<PracticeSession, 'questions' | 'answers'>): PracticeSession {
  return {
    id: 's1',
    lessonId: 'l1',
    topic: 't',
    level: 'A2',
    mode: 'challenge',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: 'l1' },
    status: 'completed',
    currentIndex: 0,
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 2,
    targetQuestionCount: 12,
    ...partial,
  }
}

describe('practiceMastery', () => {
  it('counts first-try only and ignores corrections for mastery', () => {
    const questions = [q('a', 5), q('b', 10), q('c', 15)]
    const snap = computePracticeMasterySnapshot(
      session({
        questions,
        targetQuestionCount: 12,
        answers: [
          ans('a', { isCorrect: true, corrected: false, xpEarned: 5 }),
          ans('b', { isCorrect: false, corrected: false, xpEarned: 0 }),
          ans('b', { isCorrect: true, corrected: true, xpEarned: 4 }),
          ans('c', { isCorrect: true, corrected: false, xpEarned: 15 }),
        ],
      })
    )
    expect(snap.masteryScore).toBe(2)
    expect(snap.correctedCount).toBe(1)
    expect(snap.firstTrySessionXp).toBe(20)
    expect(snap.plannedLength).toBe(12)
    expect(snap.masteryPercent).toBe(17)
  })

  it('uses planned length even when few answers', () => {
    const snap = computePracticeMasterySnapshot(
      session({
        questions: [q('a'), q('b'), q('c')],
        targetQuestionCount: 12,
        answers: [ans('a', { isCorrect: true, corrected: false })],
      })
    )
    expect(snap.masteryScore).toBe(1)
    expect(snap.masteryPercent).toBe(8)
  })
})
