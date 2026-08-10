import type { NecessaryWord, NecessaryWordsCatalog } from '@/types/vocabulary'

let cached: NecessaryWord[] | null = null
let inflight: Promise<NecessaryWord[]> | null = null

export function getCachedNecessaryWords(): NecessaryWord[] | null {
  return cached
}

export async function loadActiveNecessaryWords(): Promise<NecessaryWord[]> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const response = await fetch('/data/vocabulary/necessary-words.json')
      if (!response.ok) return []
      const raw = (await response.json()) as NecessaryWordsCatalog
      cached = (raw.words ?? []).filter((word) => word.status === 'active')
      return cached
    } catch {
      return []
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Warm client cache after catalog fetch (screens / AppShell). */
export function setCachedNecessaryWords(words: NecessaryWord[] | null): void {
  cached = words
}

/** @deprecated use setCachedNecessaryWords */
export function __setCachedNecessaryWordsForTests(words: NecessaryWord[] | null): void {
  setCachedNecessaryWords(words)
}
