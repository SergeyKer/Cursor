import { describe, expect, it } from 'vitest'
import { applyVocabularyReview, buildWorldSessionWords, createEmptyWordProgress, isWordDue } from '@/lib/vocabulary/srs'
import type { NecessaryWord } from '@/types/vocabulary'

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
      { id: 1, en: 'Home', ru: 'дом', transcription: '', source: '', tags: ['home'], status: 'active', primaryWorld: 'home' },
      { id: 2, en: 'Cat', ru: 'кот', transcription: '', source: '', tags: ['home'], status: 'active', primaryWorld: 'home' },
      { id: 3, en: 'Dog', ru: 'собака', transcription: '', source: '', tags: ['home'], status: 'active', primaryWorld: 'home' },
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
})
