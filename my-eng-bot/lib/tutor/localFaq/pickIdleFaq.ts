import { listLocalFaqForLevels, resolveFaqLevelWindow } from '@/lib/tutor/localFaq/catalog'
import type { LocalFaqEntry } from '@/lib/tutor/localFaq/types'
import type { LevelId } from '@/lib/types'

/** Soft boost added to popularity when topicKey is in boost set (jitter stays *8). */
export const IDLE_FAQ_SOFT_BOOST = 3

export type PickIdleFaqOpts = {
  shownIds?: Set<string> | readonly string[]
  bannedTopicKeys?: Set<string> | readonly string[]
  boostTopicKeys?: Set<string> | readonly string[]
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

function toSet(value: Set<string> | readonly string[] | undefined): Set<string> {
  if (!value) return new Set()
  if (value instanceof Set) return value
  return new Set(value)
}

/** Stable day seed: level + UTC day. */
export function idleFaqSeed(level: LevelId | null | undefined, nowMs = Date.now()): number {
  const day = Math.floor(nowMs / 86_400_000)
  const lvl = String(level ?? 'a2')
  let h = 2166136261
  const str = `${lvl}:${day}`
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Pick up to `count` idle FAQ chips: unique topicKey, idleEligible, grammar|contrast.
 * Optional 4th arg: shown/ban/boost filters (pure — no storage writes).
 */
export function pickIdleFaq(
  level: LevelId | null | undefined,
  count = 3,
  seed?: number,
  opts?: PickIdleFaqOpts
): LocalFaqEntry[] {
  const levels = resolveFaqLevelWindow(level)
  const shown = toSet(opts?.shownIds)
  const banned = toSet(opts?.bannedTopicKeys)
  const boost = toSet(opts?.boostTopicKeys)

  const pool = listLocalFaqForLevels(levels).filter(
    (e) =>
      e.idleEligible &&
      (e.genre === 'grammar' || e.genre === 'contrast') &&
      !shown.has(e.id) &&
      !banned.has(e.topicKey)
  )
  if (pool.length === 0) return []

  const ranked = [...pool].sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id))
  const rand = mulberry32(seed ?? idleFaqSeed(level))
  shuffleInPlace(ranked, rand)

  ranked.sort((a, b) => {
    const score = (x: LocalFaqEntry) =>
      x.popularity + (boost.has(x.topicKey) ? IDLE_FAQ_SOFT_BOOST : 0) + rand() * 8
    return score(b) - score(a)
  })

  const out: LocalFaqEntry[] = []
  const seenTopics = new Set<string>()
  for (const entry of ranked) {
    if (seenTopics.has(entry.topicKey)) continue
    seenTopics.add(entry.topicKey)
    out.push(entry)
    if (out.length >= count) break
  }
  return out
}
