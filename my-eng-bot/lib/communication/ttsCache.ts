import { createVocabTtsMemoryCache } from '@/lib/vocabulary/vocabTtsMemoryCache'
import type { VocabTtsCachePort } from '@/lib/vocabulary/vocabTtsCachePort'
import { makeVocabTtsCacheKey } from '@/lib/vocabulary/vocabTtsCachePort'

let activeCache: VocabTtsCachePort | null = null

export function getCommunicationTtsCache(): VocabTtsCachePort {
  if (!activeCache) activeCache = createVocabTtsMemoryCache(12)
  return activeCache
}

export function setCommunicationTtsCacheForTests(cache: VocabTtsCachePort | null): void {
  activeCache = cache
}

export { makeVocabTtsCacheKey as makeCommunicationTtsCacheKey }
