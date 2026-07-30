import type { LevelId } from '@/lib/types'

/** FAQ levels used in the pool (subset of LevelId). */
export type LocalFaqLevel = Extract<LevelId, 'a1' | 'a2' | 'b1' | 'b2'>

export type LocalFaqGenre = 'grammar' | 'contrast' | 'phrase'

/**
 * Question-only FAQ card. Answers come from tutor-explain (no local answer body).
 */
export type LocalFaqEntry = {
  id: string
  level: LocalFaqLevel
  topicKey: string
  genre: LocalFaqGenre
  /** Chip label = thread text = explain query when selected. */
  questionRu: string
  /** Match-only variants (often without leading «Почему»). */
  aliases: string[]
  /** EN fragments for needle matching. */
  enNeedles: string[]
  popularity: number
  idleEligible: boolean
}

/** Exact/alias/id or multi-token EN needle — no fuzzy Jaccard. */
export type LocalFaqMatchReason = 'id' | 'exact' | 'alias' | 'needle'

export type LocalFaqMatch = {
  entry: LocalFaqEntry
  score: number
  reason: LocalFaqMatchReason
}
