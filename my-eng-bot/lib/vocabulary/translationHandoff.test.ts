import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearVocabTranslationHandoff,
  consumeVocabTranslationHandoff,
  peekVocabTranslationHandoff,
  writeVocabTranslationHandoff,
} from '@/lib/vocabulary/translationHandoff'

describe('translationHandoff', () => {
  afterEach(() => {
    clearVocabTranslationHandoff()
    vi.unstubAllGlobals()
  })

  it('writes peeks and consumes', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
      },
    })

    writeVocabTranslationHandoff({
      lemmas: [{ en: 'sea', ru: 'море' }],
      source: 'vocab_finale',
    })
    const peeked = peekVocabTranslationHandoff()
    expect(peeked?.lemmas[0]?.en).toBe('sea')
    const consumed = consumeVocabTranslationHandoff()
    expect(consumed?.lemmas).toHaveLength(1)
    expect(peekVocabTranslationHandoff()).toBeNull()
  })

  it('stores loadStudying false for exclusive cycle handoff', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
      },
    })
    writeVocabTranslationHandoff({
      lemmas: [
        { en: 'home', ru: 'дом' },
        { en: 'cat', ru: 'кот' },
        { en: 'dog', ru: 'собака' },
      ],
      source: 'vocab_finale',
      loadStudying: false,
    })
    expect(peekVocabTranslationHandoff()?.loadStudying).toBe(false)
    expect(peekVocabTranslationHandoff()?.lemmas).toHaveLength(3)
  })
})
