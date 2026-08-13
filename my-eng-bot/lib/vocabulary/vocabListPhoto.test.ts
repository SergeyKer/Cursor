import { describe, expect, it } from 'vitest'
import { normalizeVocabListPhoto } from '@/lib/vocabulary/vocabListPhoto'

describe('normalizeVocabListPhoto', () => {
  it('keeps English words without translation for a later fill', () => {
    const result = normalizeVocabListPhoto({
      vocabulary: [{ word: 'Medium' }, { word: 'apple', translation: 'яблоко' }, { word: '' }],
    })
    expect(result.vocabulary).toEqual([
      { word: 'Medium', translation: '' },
      { word: 'apple', translation: 'яблоко' },
    ])
  })

  it('returns empty vocabulary for junk payloads', () => {
    expect(normalizeVocabListPhoto(null).vocabulary).toEqual([])
    expect(normalizeVocabListPhoto({ whatISee: {} }).vocabulary).toEqual([])
  })
})
