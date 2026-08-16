import { afterEach, describe, expect, it } from 'vitest'
import { resetAccentProgressForTests, summarizeAllAccentProgress } from '@/lib/accent/progressStorage'

const STORAGE_KEY = 'myeng.accent.progress.v1'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
  ;(globalThis as { window?: unknown }).window = {
    localStorage,
    dispatchEvent: () => true,
  }
}

describe('summarizeAllAccentProgress', () => {
  afterEach(() => {
    resetAccentProgressForTests()
    delete (globalThis as { window?: unknown }).window
  })

  it('empty map is zeros', () => {
    installMemoryStorage()
    expect(summarizeAllAccentProgress()).toEqual({ lessonCount: 0, attempts: 0, bestScore: 0 })
  })

  it('sums attempts and keeps best score', () => {
    installMemoryStorage()
    const storage = (globalThis as unknown as { window: { localStorage: { setItem: (k: string, v: string) => void } } })
      .window.localStorage
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        'th-think': {
          lessonId: 'th-think',
          version: 2,
          attempts: 2,
          lastScore: 70,
          bestScore: 80,
          lastCompletedAt: null,
          completedDates: [],
          segmentAttempts: { words: 1, pairs: 1, progressive: 0 },
          segmentSuccessfulAttempts: { words: 1, pairs: 0, progressive: 0 },
        },
        'ae-cat': {
          lessonId: 'ae-cat',
          version: 2,
          attempts: 3,
          lastScore: 90,
          bestScore: 90,
          lastCompletedAt: null,
          completedDates: [],
          segmentAttempts: { words: 3, pairs: 0, progressive: 0 },
          segmentSuccessfulAttempts: { words: 2, pairs: 0, progressive: 0 },
        },
      })
    )
    expect(summarizeAllAccentProgress()).toEqual({ lessonCount: 2, attempts: 5, bestScore: 90 })
  })
})
