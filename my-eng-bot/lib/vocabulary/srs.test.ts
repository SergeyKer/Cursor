import { describe, expect, it } from 'vitest'
import {
  applyVocabularyReview,
  buildSessionWords,
  createEmptyWordProgress,
  isWordDue,
  pickNextSessionWords,
  sessionSizeForTempo,
} from '@/lib/vocabulary/srs'
import type { NecessaryWord } from '@/types/vocabulary'

const sampleWord = (partial: Partial<NecessaryWord> & Pick<NecessaryWord, 'id' | 'en' | 'ru'>): NecessaryWord => ({
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'family',
  ...partial,
})

describe('vocabulary srs', () => {
  it('soft-fails stage by one instead of hard reset', () => {
    const base = { ...createEmptyWordProgress(42), stage: 3, successes: 2, attempts: 2 }
    const success = applyVocabularyReview(base, true, 1_000)
    const failure = applyVocabularyReview(success, false, 2_000)

    expect(success.stage).toBe(4)
    expect(failure.stage).toBe(3)
    expect(failure.failures).toBe(1)
  })

  it('treats missing schedule as due', () => {
    expect(isWordDue(null, 1_000)).toBe(true)
    expect(isWordDue(createEmptyWordProgress(1), 1_000)).toBe(true)
  })

  it('prefers due words when building a session', () => {
    const words: NecessaryWord[] = [
      sampleWord({ id: 1, en: 'Home', ru: 'дом' }),
      sampleWord({ id: 2, en: 'Cat', ru: 'кот' }),
      sampleWord({ id: 3, en: 'Dog', ru: 'собака' }),
    ]

    const result = pickNextSessionWords({
      words,
      progressMap: {
        '1': { ...createEmptyWordProgress(1), attempts: 1, nextReviewAt: 500 },
        '2': { ...createEmptyWordProgress(2), attempts: 1, nextReviewAt: 2_000 },
      },
      size: 2,
      now: 1_000,
    })

    expect(result.map((word) => word.id)).toEqual([1, 3])
  })

  it('allows up to size fresh when no review exists', () => {
    const words = [1, 2, 3, 4, 5, 6].map((id) => sampleWord({ id, en: `w${id}`, ru: `р${id}` }))
    const result = pickNextSessionWords({
      words,
      progressMap: {},
      size: 5,
      maxFresh: 3,
      now: 1_000,
    })
    expect(result).toHaveLength(5)
  })

  it('caps fresh at maxFresh when reviews exist', () => {
    const words = [1, 2, 3, 4, 5].map((id) => sampleWord({ id, en: `w${id}`, ru: `р${id}` }))
    const result = pickNextSessionWords({
      words,
      progressMap: {
        '1': { ...createEmptyWordProgress(1), attempts: 1, nextReviewAt: 500 },
      },
      size: 5,
      maxFresh: 3,
      now: 1_000,
    })
    expect(result[0]?.id).toBe(1)
    expect(result.filter((w) => w.id !== 1)).toHaveLength(3)
  })

  it('excludes in_feed and mastered (not due) from pickNext', () => {
    const words: NecessaryWord[] = [
      sampleWord({ id: 1, en: 'Home', ru: 'дом' }),
      sampleWord({ id: 2, en: 'Cat', ru: 'кот' }),
      sampleWord({ id: 3, en: 'Dog', ru: 'собака' }),
    ]

    const result = buildSessionWords({
      words,
      progressMap: {
        '1': { ...createEmptyWordProgress(1), feedStatus: 'in_feed', passedAt: 100 },
        '2': {
          ...createEmptyWordProgress(2),
          feedStatus: 'mastered',
          stage: 5,
          successes: 5,
          nextReviewAt: 9_999_999,
        },
      },
      size: 5,
      now: 500,
    })

    expect(result.map((w) => w.id)).toEqual([3])
  })

  it('resolves sprint/full sizes', () => {
    expect(sessionSizeForTempo('sprint')).toBe(3)
    expect(sessionSizeForTempo('full')).toBe(5)
    expect(sessionSizeForTempo('sprint', true)).toBe(2)
  })
})
