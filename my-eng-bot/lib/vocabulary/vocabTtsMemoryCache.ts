import type { VocabTtsCachePort } from '@/lib/vocabulary/vocabTtsCachePort'

const DEFAULT_CAPACITY = 80

export function createVocabTtsMemoryCache(capacity = DEFAULT_CAPACITY): VocabTtsCachePort {
  const map = new Map<string, ArrayBuffer>()

  return {
    get(key: string): ArrayBuffer | null {
      const hit = map.get(key)
      if (!hit) return null
      // LRU: refresh insertion order
      map.delete(key)
      map.set(key, hit)
      return hit
    },
    set(key: string, value: ArrayBuffer): void {
      if (map.has(key)) map.delete(key)
      map.set(key, value)
      while (map.size > capacity) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
    },
  }
}
