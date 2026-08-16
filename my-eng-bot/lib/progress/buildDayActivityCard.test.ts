import { describe, expect, it } from 'vitest'
import {
  buildDayActivityCard,
  formatDayInProgressLine,
  formatDayItemScore,
  formatDayOverflow,
  formatDaySessionCount,
} from '@/lib/progress/buildDayActivityCard'
import { progressCopy } from '@/lib/uiCopy/progress'
import type { PracticeAnswer, PracticeQuestion, PracticeSession } from '@/types/practice'

function toDayKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + 3 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

function question(id: string): PracticeQuestion {
  return {
    id,
    lessonId: 'l1',
    type: 'choice',
    prompt: 'p',
    targetAnswer: 'a',
    acceptedAnswers: ['a'],
    xpBase: 10,
    difficulty: 1,
    tolerance: 'strict',
  }
}

function answer(questionId: string, isCorrect: boolean): PracticeAnswer {
  return {
    questionId,
    userAnswer: 'x',
    correctAnswer: 'a',
    isCorrect,
    corrected: false,
    xpEarned: isCorrect ? 10 : 0,
    responseTimeMs: 1,
    timestamp: 1,
  }
}

function practice(partial: Partial<PracticeSession> & Pick<PracticeSession, 'id' | 'completedAt'>): PracticeSession {
  const questions = [question('a'), question('b')]
  return {
    lessonId: 'l1',
    topic: 'Present Simple',
    level: 'A2',
    mode: 'balanced',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: 'l1' },
    status: 'completed',
    currentIndex: 1,
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 2,
    targetQuestionCount: 12,
    questions,
    answers: [answer('a', true), answer('b', true)],
    ...partial,
  }
}

const empty = {
  practiceSessions: [] as PracticeSession[],
  vocabHistory: [] as Array<{
    id: string
    completedAt: number
    reviewedWordIds: number[]
    learnedWordIds: number[]
  }>,
  lessons: [] as Array<{ lessonId: string; topic: string; medal: 'gold' | 'silver' | 'bronze' | null; lastCompleted: string }>,
  accent: [] as Array<{ lessonId: string; completedDates: string[] }>,
}

describe('buildDayActivityCard', () => {
  it('lists practice on the local day and formats child score without 11/12', () => {
    const completedAt = Date.parse('2026-08-16T12:00:00.000Z')
    const card = buildDayActivityCard({
      date: '2026-08-16',
      today: '2026-08-16',
      activeDays: ['2026-08-16'],
      toDayKey,
      ...empty,
      practiceSessions: [practice({ id: 'p1', completedAt })],
    })
    expect(card.inStreak).toBe(true)
    expect(card.totalCount).toBe(1)
    expect(card.items[0]?.kind).toBe('practice')
    expect(card.items[0]?.title).toBe('Present Simple')
    expect(formatDayItemScore(card.items[0]!, 'child', progressCopy('child'))).toBe('2 из 12')
    expect(formatDayItemScore(card.items[0]!, 'adult', progressCopy('adult'))).toBe('2/12')
  })

  it('uses local day for evening UTC stamps, not iso slice', () => {
    const stamp = '2026-08-16T21:30:00.000Z'
    const cardWrongDay = buildDayActivityCard({
      date: '2026-08-16',
      today: '2026-08-17',
      activeDays: ['2026-08-16'],
      toDayKey,
      ...empty,
      lessons: [{ lessonId: '1', topic: 'Hi', medal: 'silver', lastCompleted: stamp }],
    })
    const cardLocalDay = buildDayActivityCard({
      date: '2026-08-17',
      today: '2026-08-17',
      activeDays: ['2026-08-17'],
      toDayKey,
      ...empty,
      lessons: [{ lessonId: '1', topic: 'Hi', medal: 'silver', lastCompleted: stamp }],
    })
    expect(cardWrongDay.items).toEqual([])
    expect(cardLocalDay.items).toHaveLength(1)
    expect(formatDayItemScore(cardLocalDay.items[0]!, 'adult', progressCopy('adult'))).toBe('серебро')
  })

  it('marks streak with empty items', () => {
    const card = buildDayActivityCard({
      date: '2026-08-12',
      today: '2026-08-16',
      activeDays: ['2026-08-12'],
      toDayKey,
      ...empty,
    })
    expect(card.inStreak).toBe(true)
    expect(card.items).toEqual([])
    expect(card.inProgress).toBeNull()
  })

  it('empty day has no streak and no items', () => {
    const card = buildDayActivityCard({
      date: '2026-08-11',
      today: '2026-08-16',
      activeDays: ['2026-08-12'],
      toDayKey,
      ...empty,
    })
    expect(card.inStreak).toBe(false)
    expect(card.totalCount).toBe(0)
  })

  it('does not attach inProgress to yesterday', () => {
    const card = buildDayActivityCard({
      date: '2026-08-15',
      today: '2026-08-16',
      activeDays: ['2026-08-15'],
      toDayKey,
      ...empty,
      translationSession: { status: 'in_progress', progress: 5, target: 8 },
    })
    expect(card.inProgress).toBeNull()
  })

  it('keeps today inProgress even without closed items', () => {
    const card = buildDayActivityCard({
      date: '2026-08-16',
      today: '2026-08-16',
      activeDays: [],
      toDayKey,
      ...empty,
      translationSession: { status: 'in_progress', progress: 5, target: 8 },
    })
    expect(card.inProgress).toEqual({ kind: 'translation', progress: 5, target: 8 })
    expect(formatDayInProgressLine(card.inProgress!, 'child', progressCopy('child'))).toBe('сейчас · 5 из 8')
  })

  it('caps displayed items and reports overflow', () => {
    const base = Date.parse('2026-08-16T10:00:00.000Z')
    const sessions = Array.from({ length: 6 }, (_, i) =>
      practice({ id: `p${i}`, completedAt: base + i * 1000, topic: `T${i}` })
    )
    const card = buildDayActivityCard({
      date: '2026-08-16',
      today: '2026-08-16',
      activeDays: ['2026-08-16'],
      toDayKey,
      ...empty,
      practiceSessions: sessions,
    })
    expect(card.totalCount).toBe(6)
    expect(card.items).toHaveLength(5)
    expect(formatDayOverflow(card.totalCount - card.items.length, progressCopy('adult'))).toBe('ещё 1')
    expect(formatDaySessionCount(6)).toBe('6 занятий')
  })

  it('skips lesson saved on another day', () => {
    const card = buildDayActivityCard({
      date: '2026-08-16',
      today: '2026-08-16',
      activeDays: ['2026-08-16'],
      toDayKey,
      ...empty,
      lessons: [{ lessonId: '1', topic: 'Hi', medal: 'gold', lastCompleted: '2026-08-10T12:00:00.000Z' }],
    })
    expect(card.items).toEqual([])
  })
})
