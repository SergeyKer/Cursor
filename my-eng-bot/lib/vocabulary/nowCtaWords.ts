import type { VocabNowKind } from '@/lib/vocabulary/fuel'
import type { NecessaryWord } from '@/types/vocabulary'

/** Same word source as hub `handleNow` for the current `nowKind`. */
export function wordsForNowCta(
  kind: VocabNowKind,
  sources: {
    fuel: NecessaryWord[]
    inFeed: NecessaryWord[]
    pause: NecessaryWord[]
  }
): NecessaryWord[] {
  if (kind === 'empty') return []
  if (kind === 'errors-bridge' || kind === 'bank-bridge') {
    const bank = sources.inFeed.slice(0, 3)
    const fromFuel = sources.fuel
    const source = kind === 'errors-bridge' || bank.length === 0 ? fromFuel : bank
    return source.length ? source : bank
  }
  if (kind === 'pause') return sources.pause
  return sources.fuel
}
