import { describe, expect, it } from 'vitest'
import { applyVocabularyReview, buildSessionWords, buildWorldSessionWords, createEmptyWordProgress, isWordDue } from '@/lib/vocabulary/srs'
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
  it('moves a word through intervals on success and resets on failure', () => {
    const base = createEmptyWordProgress(42)
    const success = applyVocabularyReview(base, true, 1_000)
    const failure = applyVocabularyReview(success, false, 2_000)

    expect(success.stage).toBe(1)
    expect(success.nextReviewAt).toBe(1_000 + 24 * 60 * 60 * 1000)
    expect(failure.stage).toBe(0)
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

    const result = buildWorldSessionWords({
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

  it('excludes strictly learned words from new sessions', () => {
    const words: NecessaryWord[] = [
      sampleWord({ id: 1, en: 'Home', ru: 'дом' }),
      sampleWord({ id: 2, en: 'Cat', ru: 'кот' }),
    ]

    const result = buildSessionWords({
      words,
      progressMap: {
        '1': {
          wordId: 1,
          stage: 4,
          attempts: 6,
          successes: 3,
          failures: 0,
          lastReviewedAt: 100,
          nextReviewAt: 200,
        },
      },
      size: 5,
      now: 500,
    })

    expect(result.every((w) => w.id !== 1)).toBe(true)
    expect(result.map((w) => w.id)).toContain(2)
  })
})
