import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolvePracticeCompletion } from '@/lib/practice/resolvePracticeCompletion'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeSession } from '@/types/practice'

function completedChallengeSession(): PracticeSession {
  const questions = Array.from({ length: 12 }, (_, index) => ({
    id: `q-${index + 1}`,
    lessonId: 'topic-1',
    type: 'choice' as const,
    prompt: `Prompt ${index + 1}`,
    targetAnswer: `Answer ${index + 1}`,
    acceptedAnswers: [`Answer ${index + 1}`],
    xpBase: 5,
    difficulty: 1 as const,
    tolerance: 'normalized' as const,
  }))
  return {
    id: 'session-1',
    lessonId: 'topic-1',
    topic: 'Topic',
    level: 'A1',
    mode: 'challenge',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: 'topic-1' },
    status: 'completed',
    questions,
    currentIndex: 11,
    answers: questions.map((question, index) => ({
      questionId: question.id,
      userAnswer: question.targetAnswer,
      correctAnswer: question.targetAnswer,
      isCorrect: true,
      corrected: false,
      xpEarned: question.xpBase,
      responseTimeMs: 1000,
      timestamp: index + 1,
    })),
    score: 12,
    xp: 60,
    streak: 12,
    startedAt: 1,
    completedAt: 2,
    version: 1,
    targetQuestionCount: 12,
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('resolvePracticeCompletion', () => {
  it('uses mastery for a qualifying ring and skips duplicate completion rewards', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 12, 12))
    const storage = new Map<string, string>()
    const progress = {
      ...createEmptyPracticeTopicProgress('topic-1'),
      ringCount: 2,
      lastQualifyingDayKey: '2026-07-11',
    }
    storage.set('myeng:practice-topic-progress:v1', JSON.stringify({ 'topic-1': progress }))
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    vi.stubGlobal('window', { localStorage })

    const session = completedChallengeSession()
    const first = resolvePracticeCompletion({ session, lessonMedal: 'gold' })
    expect(first.reward.ringIncremented).toBe(true)
    expect(first.reward.progress.ringCount).toBe(3)
    expect(first.coinsAwarded).toBe(1)
    expect(first.coinMilestones[0]?.key).toBe('topic-1:ring3')

    const duplicate = resolvePracticeCompletion({ session, lessonMedal: 'gold' })
    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.globalXpToAward).toBe(0)
    expect(duplicate.coinsAwarded).toBe(0)
    expect(duplicate.reward.progress.ringCount).toBe(3)
    expect(duplicate.activityNeeded).toBe(false)
  })

  it('uses paid effective mastery for the ring without raising raw mastery', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 12, 12))
    const storage = new Map<string, string>()
    const progress = {
      ...createEmptyPracticeTopicProgress('topic-1'),
      lastQualifyingDayKey: '2026-07-11',
    }
    storage.set('myeng:practice-topic-progress:v1', JSON.stringify({ 'topic-1': progress }))
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })

    const session = completedChallengeSession()
    session.id = 'session-forgiven'
    session.answers = session.answers.map((answer, index) =>
      index < 2 ? { ...answer, isCorrect: false, xpEarned: 0 } : answer
    )
    session.score = 10
    session.forgivenessUsedThisRun = true
    session.forgivenessEffectiveBonus = 1

    const outcome = resolvePracticeCompletion({ session, lessonMedal: 'silver' })
    expect(outcome.masteryScore).toBe(10)
    expect(outcome.effectiveMasteryScore).toBe(11)
    expect(outcome.reward.ringIncremented).toBe(true)
    expect(outcome.forgivenessUsed).toBe(true)
  })

  it('claims the practice badge rank 1 only once at 8/9 mastery', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })
    const firstSession = completedChallengeSession()
    firstSession.id = 'balanced-1'
    firstSession.mode = 'balanced'
    firstSession.lessonId = '4'
    firstSession.questions = firstSession.questions.slice(0, 9)
    firstSession.answers = firstSession.answers.slice(0, 8)
    firstSession.targetQuestionCount = 9
    firstSession.currentIndex = 8
    firstSession.score = 8

    const first = resolvePracticeCompletion({ session: firstSession, lessonMedal: 'silver' })
    expect(first.baseBadgeAwarded).toBe(true)
    expect(first.badgeRankAwarded).toBe(1)
    expect(first.badgeLine).toContain('Начинающий собеседник')
    expect(first.reward.progress.baseBadgeClaimedAt).toBeTypeOf('number')
    expect(first.reward.progress.badgeRank).toBe(1)

    const repeat = resolvePracticeCompletion({
      session: { ...firstSession, id: 'balanced-2' },
      lessonMedal: 'silver',
    })
    expect(repeat.baseBadgeAwarded).toBe(false)
    expect(repeat.badgeRankAwarded).toBeNull()
  })
})
