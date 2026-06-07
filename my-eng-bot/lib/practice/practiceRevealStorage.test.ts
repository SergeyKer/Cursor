import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  isPracticeQuestionRevealed,
  markPracticeQuestionRevealed,
} from '@/lib/practice/practiceRevealStorage'

function createMemorySessionStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
}

describe('practiceRevealStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createMemorySessionStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks and reads reveal state per session question', () => {
    expect(isPracticeQuestionRevealed('s1', 'q1')).toBe(false)
    markPracticeQuestionRevealed('s1', 'q1')
    expect(isPracticeQuestionRevealed('s1', 'q1')).toBe(true)
    expect(isPracticeQuestionRevealed('s1', 'q2')).toBe(false)
    expect(isPracticeQuestionRevealed('s2', 'q1')).toBe(false)
  })
})
