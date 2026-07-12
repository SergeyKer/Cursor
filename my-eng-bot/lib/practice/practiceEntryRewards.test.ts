import { afterEach, describe, expect, it, vi } from 'vitest'
import { claimPracticeEntryRewards } from '@/lib/practice/practiceEntryRewards'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'

afterEach(() => vi.unstubAllGlobals())

describe('claimPracticeEntryRewards', () => {
  it('claims pending coins and cup once before briefing', () => {
    const storage = new Map<string, string>()
    storage.set(
      'myeng:practice-topic-progress:v1',
      JSON.stringify({
        topic: {
          ...createEmptyPracticeTopicProgress('topic'),
          ringCount: 5,
          pendingPracticeCoins: 3,
          pendingCup: true,
        },
      })
    )
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })

    const first = claimPracticeEntryRewards({ lessonId: 'topic', tier: 2 })
    expect(first.claimed).toBe(true)
    expect(first.coinsAwarded).toBe(3)
    expect(first.cupAwarded).toBe(1)
    expect(first.visibleText).toContain('дождалась золотой медали')

    const second = claimPracticeEntryRewards({ lessonId: 'topic', tier: 2 })
    expect(second.claimed).toBe(false)
  })
})
