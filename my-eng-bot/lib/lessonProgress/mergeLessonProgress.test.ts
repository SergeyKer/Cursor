import { describe, expect, it } from 'vitest'
import {
  fromCloudLessonProgressV1,
  pickWinningLessonProgress,
  toCloudLessonProgressV1,
  estimateCloudPayloadBytes,
} from '@/lib/lessonProgress/cloudTypes'
import type { UserLessonProgress } from '@/types/userProgress'

function baseProgress(overrides: Partial<UserLessonProgress> = {}): UserLessonProgress {
  return {
    lessonId: 'lesson-1',
    topic: 'Topic',
    level: 'A2',
    completedSteps: [1],
    completedVariants: [],
    xp: 10,
    combo: 1,
    coreXp: 10,
    comboXp: 0,
    totalXp: 10,
    maxCoreXp: 100,
    corePercent: 10,
    strengthPercent: 10,
    maxCombo: 1,
    bestCoreXp: 10,
    bestTotalXp: 10,
    medal: null,
    mistakes: [{ step: 1, userAnswer: 'secret local', correctAnswer: 'ok' }],
    lastCompleted: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('lessonProgress cloud types / merge', () => {
  it('strips mistakes and deprecated fields for cloud payload', () => {
    const cloud = toCloudLessonProgressV1(baseProgress({ xp: 99, combo: 9 }))
    expect('mistakes' in cloud).toBe(false)
    expect('xp' in cloud).toBe(false)
    expect('combo' in cloud).toBe(false)
    expect(cloud.coreXp).toBe(10)
    expect(estimateCloudPayloadBytes(cloud)).toBeGreaterThan(10)
  })

  it('preserves local mistakes when hydrating from cloud', () => {
    const local = baseProgress()
    const cloud = toCloudLessonProgressV1(baseProgress({ coreXp: 20, totalXp: 20, bestCoreXp: 20, bestTotalXp: 20 }))
    const hydrated = fromCloudLessonProgressV1(cloud, local)
    expect(hydrated.mistakes).toEqual(local.mistakes)
    expect(hydrated.coreXp).toBe(20)
  })

  it('picks newer clientUpdatedAt', () => {
    const local = {
      progress: baseProgress({ coreXp: 1 }),
      clientUpdatedAt: '2026-07-02T00:00:00.000Z',
      revision: 1,
    }
    const remote = {
      progress: baseProgress({ coreXp: 99 }),
      clientUpdatedAt: '2026-07-03T00:00:00.000Z',
      revision: 1,
    }
    expect(pickWinningLessonProgress(local, remote).winner).toBe('remote')
  })

  it('uses revision when timestamps equal', () => {
    const ts = '2026-07-02T00:00:00.000Z'
    const local = {
      progress: baseProgress({ coreXp: 5 }),
      clientUpdatedAt: ts,
      revision: 3,
    }
    const remote = {
      progress: baseProgress({ coreXp: 50 }),
      clientUpdatedAt: ts,
      revision: 2,
    }
    expect(pickWinningLessonProgress(local, remote).winner).toBe('local')
  })

  it('keeps local on equal timestamp and revision', () => {
    const ts = '2026-07-02T00:00:00.000Z'
    const local = {
      progress: baseProgress({ coreXp: 5 }),
      clientUpdatedAt: ts,
      revision: 2,
    }
    const remote = {
      progress: baseProgress({ coreXp: 50 }),
      clientUpdatedAt: ts,
      revision: 2,
    }
    expect(pickWinningLessonProgress(local, remote).winner).toBe('local')
  })

  it('keeps local when remote timestamp invalid', () => {
    const local = {
      progress: baseProgress(),
      clientUpdatedAt: '2026-07-02T00:00:00.000Z',
      revision: 1,
    }
    const remote = {
      progress: baseProgress({ coreXp: 99 }),
      clientUpdatedAt: 'not-a-date',
      revision: 9,
    }
    expect(pickWinningLessonProgress(local, remote).winner).toBe('local')
  })
})
