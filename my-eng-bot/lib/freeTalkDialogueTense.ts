/**
 * Взвешенный выбор времени для диалога «свободная тема»:
 * чаще простые времена, реже сложные (Future Perfect и т.д.).
 */

import type { TenseId } from './types'

/** FNV-1a — совпадает с app/api/chat/route.ts для воспроизводимости. */
export function stableHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const TENSE_WEIGHTS: Partial<Record<string, number>> = {
  present_simple: 28,
  past_simple: 22,
  future_simple: 22,
  present_continuous: 14,
  past_continuous: 6,
  future_continuous: 4,
  present_perfect: 10,
  past_perfect: 4,
  future_perfect: 3,
  present_perfect_continuous: 5,
  past_perfect_continuous: 2,
  future_perfect_continuous: 2,
}

function pickIndexByWeights(weights: number[], seed: string): number {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return 0
  const r = stableHash32(seed) % total
  let acc = 0
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i] ?? 0
    if (r < acc) return i
  }
  return weights.length - 1
}

export function pickWeightedFreeTalkTense(params: {
  candidates: string[]
  seed: string
  excludeTense?: string | null
}): string {
  let pool = Array.from(new Set(params.candidates.filter(Boolean)))
  if (pool.length === 0) pool = ['present_simple']

  const ex = params.excludeTense
  if (ex && pool.length > 1) {
    const filtered = pool.filter((t) => t !== ex)
    if (filtered.length > 0) pool = filtered
  }

  const weights = pool.map((t) => TENSE_WEIGHTS[t] ?? 6)
  const idx = pickIndexByWeights(weights, params.seed)
  return pool[idx] ?? pool[0]
}

export function buildAdultFullTensePool(): TenseId[] {
  return [
    'present_simple',
    'past_simple',
    'future_simple',
    'present_continuous',
    'past_continuous',
    'future_continuous',
    'present_perfect',
    'past_perfect',
    'future_perfect',
    'present_perfect_continuous',
    'past_perfect_continuous',
    'future_perfect_continuous',
  ]
}
