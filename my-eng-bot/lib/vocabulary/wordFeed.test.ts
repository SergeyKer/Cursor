import { describe, expect, it } from 'vitest'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import {
  canMarkWordPassed,
  markWordPassed,
  pickFocusLemmasForMode,
  pickFeedForInjection,
  recordFeedFail,
  recordFeedUse,
} from '@/lib/vocabulary/wordFeed'
import type { NecessaryWord } from '@/types/vocabulary'

const word = (id: number, en: string): NecessaryWord => ({
  id,
  en,
  ru: en,
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
})

describe('wordFeed', () => {
  it('rejects bank without check or speak', () => {
    expect(
      canMarkWordPassed({
        progress: createEmptyWordProgress(1),
        checkPassed: false,
        speakPassed: true,
        phrasePassed: true,
        phraseRequired: true,
      })
    ).toBe(false)
    expect(
      canMarkWordPassed({
        progress: createEmptyWordProgress(1),
        checkPassed: true,
        speakPassed: false,
        phrasePassed: true,
        phraseRequired: false,
      })
    ).toBe(false)
  })

  it('banks Path A without phrase when not required', () => {
    const next = markWordPassed({
      progress: createEmptyWordProgress(1),
      checkPassed: true,
      speakPassed: true,
      phrasePassed: false,
      phraseRequired: false,
      now: 1000,
    })
    expect(next?.feedStatus).toBe('in_feed')
    expect(next?.passedAt).toBe(1000)
  })

  it('requires phrase when required', () => {
    expect(
      markWordPassed({
        progress: createEmptyWordProgress(1),
        checkPassed: true,
        speakPassed: true,
        phrasePassed: false,
        phraseRequired: true,
      })
    ).toBeNull()
  })

  it('masters after useStreak >= 2 and resets on fail', () => {
    const banked = markWordPassed({
      progress: createEmptyWordProgress(1),
      checkPassed: true,
      speakPassed: true,
      phrasePassed: true,
      phraseRequired: true,
    })!
    const once = recordFeedUse(banked, 1)
    expect(once.feedStatus).toBe('in_feed')
    const twice = recordFeedUse(once, 2)
    expect(twice.feedStatus).toBe('mastered')
    expect(twice.useStreak).toBe(2)
    const failed = recordFeedFail(twice, 3)
    expect(failed.feedStatus).toBe('returned')
    expect(failed.useStreak).toBe(0)
  })

  it('pickFocus caps errors and fresh at 1', () => {
    const words = [1, 2, 3, 4, 5].map((id) => word(id, `w${id}`))
    const progressMap = {
      '1': { ...createEmptyWordProgress(1), feedStatus: 'returned' as const, attempts: 1 },
      '2': { ...createEmptyWordProgress(2), feedStatus: 'returned' as const, attempts: 1 },
      '3': { ...createEmptyWordProgress(3), attempts: 2, nextReviewAt: 1 },
      '4': createEmptyWordProgress(4),
      '5': createEmptyWordProgress(5),
    }
    const picked = pickFocusLemmasForMode({ words, progressMap, n: 3, now: 10 })
    const ids = picked.map((p) => p.wordId)
    expect(ids.filter((id) => id === 1 || id === 2)).toHaveLength(1)
    expect(ids.filter((id) => id === 4 || id === 5)).toHaveLength(1)
  })

  it('push bypasses into injection list', () => {
    const words = [word(9, 'circus')]
    const lemmas = pickFeedForInjection({
      words,
      progressMap: {
        '9': { ...createEmptyWordProgress(9), feedStatus: 'in_feed', passedAt: 1 },
      },
      wordIds: [9],
      n: 3,
    })
    expect(lemmas[0]?.en).toBe('circus')
  })
})
