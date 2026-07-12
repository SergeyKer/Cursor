import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addPracticeGlobalXpToday,
  getPracticeGlobalXpToday,
  getPracticeTopicProgress,
} from '@/lib/practice/practiceTopicProgressStorage'

const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('practice daily XP storage', () => {
  it('uses the local economy day and does not merge the prior UTC bucket', () => {
    process.env.TZ = 'America/Los_Angeles'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T01:30:00.000Z'))

    const storage = new Map<string, string>()
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    vi.stubGlobal('window', { localStorage })

    const key = 'myeng:practice-global-xp-today:v1'
    storage.set(key, JSON.stringify({ day: '2026-07-13', amount: 40 }))
    expect(getPracticeGlobalXpToday()).toBe(0)

    addPracticeGlobalXpToday(5)
    expect(JSON.parse(storage.get(key) ?? '{}')).toEqual({ day: '2026-07-12', amount: 5 })
  })

  it('normalizes v2 progress fields and per-mode lanes', () => {
    const storage = new Map<string, string>()
    storage.set(
      'myeng:practice-topic-progress:v1',
      JSON.stringify({
        'topic-1': {
          lessonId: 'wrong-id',
          ringCount: 3,
          economyVersion: 2,
          lastQualifyingDayKey: '2026-07-12',
          pendingPracticeCoins: 1,
          pendingCup: true,
          xpByMode: {
            challenge: {
              slotsFilled: 99,
              rewardedFingerprints: ['fp', 1],
              slotScores: [92, 'bad'],
            },
          },
        },
      })
    )
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    vi.stubGlobal('window', { localStorage })

    const progress = getPracticeTopicProgress('topic-1')
    expect(progress.lessonId).toBe('topic-1')
    expect(progress.economyVersion).toBe(2)
    expect(progress.pendingPracticeCoins).toBe(1)
    expect(progress.pendingCup).toBe(true)
    expect(progress.xpByMode?.challenge).toEqual({
      slotsFilled: 5,
      rewardedFingerprints: ['fp'],
      slotScores: [92],
    })
  })
})
