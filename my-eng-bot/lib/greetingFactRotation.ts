import {
  HOME_GREETING_FACTS,
  HOME_GREETING_FACTS_CHILD,
  HOME_GREETING_FACT_CHILD_COUNT,
  HOME_GREETING_FACT_COUNT,
} from '@/lib/homeGreetingFacts'
import type { Audience } from '@/lib/types'

const STORAGE_KEY_ADULT = 'myeng-greeting-fact-rotation-v1'
const STORAGE_KEY_CHILD = 'myeng-greeting-fact-rotation-child-v1'

type StoredState = {
  n: number
  permutation: number[]
  cursor: number
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function poolFor(audience: Audience | null | undefined): {
  facts: readonly string[]
  count: number
  key: string
} {
  if (audience === 'child') {
    return {
      facts: HOME_GREETING_FACTS_CHILD,
      count: HOME_GREETING_FACT_CHILD_COUNT,
      key: STORAGE_KEY_CHILD,
    }
  }
  return {
    facts: HOME_GREETING_FACTS,
    count: HOME_GREETING_FACT_COUNT,
    key: STORAGE_KEY_ADULT,
  }
}

function readState(key: string, count: number): StoredState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredState
    if (
      typeof data.n !== 'number' ||
      !Array.isArray(data.permutation) ||
      typeof data.cursor !== 'number' ||
      data.n !== count ||
      data.permutation.length !== count
    ) {
      return null
    }
    const set = new Set(data.permutation)
    if (set.size !== count) return null
    for (let i = 0; i < count; i++) {
      if (!set.has(i)) return null
    }
    return data
  } catch {
    return null
  }
}

function writeState(key: string, state: StoredState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

/**
 * Следующий факт из очереди без повторов до прохода всех N строк.
 * Child and adult use separate pools and storage keys.
 */
export function consumeNextGreetingFactLine(audience?: Audience | null): string {
  const { facts, count, key } = poolFor(audience)
  let state = readState(key, count)
  if (!state) {
    state = {
      n: count,
      permutation: shuffleIndices(count),
      cursor: 0,
    }
    writeState(key, state)
  }

  const idx = state.permutation[state.cursor]!
  const line = facts[idx] ?? facts[0]!

  let nextCursor = state.cursor + 1
  let perm = state.permutation
  if (nextCursor >= count) {
    perm = shuffleIndices(count)
    nextCursor = 0
  }

  writeState(key, {
    n: count,
    permutation: perm,
    cursor: nextCursor,
  })

  return line
}
