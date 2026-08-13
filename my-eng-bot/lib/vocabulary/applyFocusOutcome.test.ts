import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyFocusLemmasOutcome } from '@/lib/vocabulary/applyFocusOutcome'
import { setCachedNecessaryWords } from '@/lib/vocabulary/catalogCache'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
  resetVocabularyProgressForTests,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import type { NecessaryWord } from '@/types/vocabulary'

const word = (id: number, en: string, ru: string): NecessaryWord => ({
  id,
  en,
  ru,
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
})

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
  clear(): void {
    this.store.clear()
  }
}

describe('applyFocusLemmasOutcome', () => {
  beforeEach(() => {
    const storage = new MemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })
    setCachedNecessaryWords([word(7, 'shashlik', 'шашлык'), word(8, 'apple', 'яблоко')])
    const state = createEmptyVocabularyProgress()
    state.words['7'] = {
      ...createEmptyWordProgress(7),
      feedStatus: 'in_feed',
      useStreak: 0,
      lemmaKey: 'shashlik',
    }
    saveVocabularyProgress(state)
  })

  afterEach(() => {
    resetVocabularyProgressForTests()
    setCachedNecessaryWords(null)
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('does not master from translation success', () => {
    applyFocusLemmasOutcome({
      lemmas: [{ en: 'shashlik', ru: 'шашлык', wordId: 7 }],
      outcome: 'success',
      source: 'translation',
    })
    applyFocusLemmasOutcome({
      lemmas: [{ en: 'shashlik', ru: 'шашлык', wordId: 7 }],
      outcome: 'success',
      source: 'translation',
    })
    const progress = loadVocabularyProgress().words['7']
    expect(progress?.feedStatus).toBe('in_feed')
  })

  it('masters only lemmas present in live utterance', () => {
    applyFocusLemmasOutcome({
      lemmas: [
        { en: 'shashlik', ru: 'шашлык', wordId: 7 },
        { en: 'apple', ru: 'яблоко', wordId: 8 },
      ],
      outcome: 'success',
      userText: 'I ate shashlik yesterday',
      source: 'communication',
    })
    const state = loadVocabularyProgress()
    expect(state.words['7']?.feedStatus).toBe('mastered')
    expect(state.words['8']?.feedStatus).not.toBe('mastered')
  })

  it('records fail + mistake on code-switch', () => {
    applyFocusLemmasOutcome({
      lemmas: [{ en: 'shashlik', ru: 'шашлык', wordId: 7 }],
      outcome: 'fail',
      userText: 'Я ел шашлык yesterday',
      source: 'translation',
    })
    const progress = loadVocabularyProgress().words['7']
    expect(progress?.useStreak).toBe(0)
    expect(progress?.feedStatus).toBe('returned')
    expect(loadVocabMistakes()[0]?.en.toLowerCase()).toContain('shashlik')
  })
})
