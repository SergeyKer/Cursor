import { afterEach, describe, expect, it } from 'vitest'
import {
  createEmptyVocabularyProgress,
  finalizeVocabularySession,
  loadVocabularyProgress,
  recordWordReview,
  resetVocabularyProgressForTests,
  saveVocabularyProgress,
  unlockWorld,
} from '@/lib/vocabulary/storage'

class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }
}

function withWindowStorage() {
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    configurable: true,
  })
  return storage
}

describe('vocabulary storage', () => {
  afterEach(() => {
    resetVocabularyProgressForTests()
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('safely falls back when storage is unavailable', () => {
    expect(loadVocabularyProgress().stats.unlockedWorldIds).toEqual(['home'])
  })

  it('saves and restores progress with reviewed words and history', () => {
    withWindowStorage()
    let progress = createEmptyVocabularyProgress()
    progress = recordWordReview({ state: progress, wordId: 42, wasCorrect: true, now: 10 })
    progress = unlockWorld(progress, 'travel')
    progress = finalizeVocabularySession({
      state: progress,
      coinsEarned: 9,
      historyItem: {
        id: 'session-1',
        worldId: 'home',
        startedAt: 1,
        completedAt: 2,
        reviewedWordIds: [42],
        learnedWordIds: [42],
        coinsEarned: 9,
        promptPreview: 'prompt',
      },
    })

    saveVocabularyProgress(progress)
    const restored = loadVocabularyProgress()

    expect(restored.words['42']?.successes).toBe(1)
    expect(restored.stats.unlockedWorldIds).toContain('travel')
    expect(restored.history[0]?.id).toBe('session-1')
  })
})
