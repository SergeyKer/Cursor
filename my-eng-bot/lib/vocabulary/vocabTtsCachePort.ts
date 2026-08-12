import type { VocabTtsCachePort } from '@/lib/vocabulary/vocabTtsCachePort'
import { createVocabTtsMemoryCache } from '@/lib/vocabulary/vocabTtsMemoryCache'

let activeCache: VocabTtsCachePort | null = null

export function getVocabTtsCache(): VocabTtsCachePort {
  if (!activeCache) activeCache = createVocabTtsMemoryCache()
  return activeCache
}

/** Test/helpers: inject or reset cache implementation. */
export function setVocabTtsCacheForTests(cache: VocabTtsCachePort | null): void {
  activeCache = cache
}

export function makeVocabTtsCacheKey(text: string, voiceId: string, speed: number): string {
  return `${text}\0${voiceId}\0${speed}`
}
