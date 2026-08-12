import { describe, expect, it } from 'vitest'
import { buildVocabPronunciationReplace } from '@/lib/vocabulary/pronunciationReplace'
import { clampVocabTtsSpeed } from '@/lib/vocabulary/clampVocabTtsSpeed'
import { createVocabTtsMemoryCache } from '@/lib/vocabulary/vocabTtsMemoryCache'
import { makeVocabTtsCacheKey } from '@/lib/vocabulary/vocabTtsCachePort'

describe('buildVocabPronunciationReplace', () => {
  it('maps Eye to IPA', () => {
    expect(buildVocabPronunciationReplace('Eye')).toEqual({ Eye: '/aɪ/' })
    expect(buildVocabPronunciationReplace('eye')).toEqual({ eye: '/aɪ/' })
  })

  it('maps Eye inside a phrase', () => {
    expect(buildVocabPronunciationReplace('I know the word Eye.')).toEqual({ Eye: '/aɪ/' })
  })

  it('returns undefined for unrelated text', () => {
    expect(buildVocabPronunciationReplace('hello')).toBeUndefined()
  })
})

describe('clampVocabTtsSpeed', () => {
  it('clamps 0.6 to 0.7', () => {
    expect(clampVocabTtsSpeed(0.6)).toBe(0.7)
  })

  it('keeps 1 and clamps high', () => {
    expect(clampVocabTtsSpeed(1)).toBe(1)
    expect(clampVocabTtsSpeed(2)).toBe(1.5)
  })
})

describe('vocabTtsMemoryCache', () => {
  it('stores and refreshes LRU', () => {
    const cache = createVocabTtsMemoryCache(2)
    const a = new Uint8Array([1]).buffer
    const b = new Uint8Array([2]).buffer
    const c = new Uint8Array([3]).buffer
    cache.set('a', a)
    cache.set('b', b)
    expect(cache.get('a')).toBe(a)
    cache.set('c', c)
    expect(cache.get('b')).toBeNull()
    expect(cache.get('a')).toBe(a)
    expect(cache.get('c')).toBe(c)
  })

  it('builds stable cache keys', () => {
    expect(makeVocabTtsCacheKey('Eye', 'luna', 0.7)).toBe(`Eye${'\u0000'}luna${'\u0000'}0.7`)
  })
})
