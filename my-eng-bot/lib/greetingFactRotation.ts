import { HOME_GREETING_FACTS, HOME_GREETING_FACT_COUNT } from '@/lib/homeGreetingFacts'

const STORAGE_KEY = 'myeng-greeting-fact-rotation-v1'

type StoredState = {
  /** Версия длины массива — при смене пула сбрасываем цикл */
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

function readState(): StoredState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredState
    if (
      typeof data.n !== 'number' ||
      !Array.isArray(data.permutation) ||
      typeof data.cursor !== 'number' ||
      data.n !== HOME_GREETING_FACT_COUNT ||
      data.permutation.length !== HOME_GREETING_FACT_COUNT
    ) {
      return null
    }
    const set = new Set(data.permutation)
    if (set.size !== HOME_GREETING_FACT_COUNT) return null
    for (let i = 0; i < HOME_GREETING_FACT_COUNT; i++) {
      if (!set.has(i)) return null
    }
    return data
  } catch {
    return null
  }
}

function writeState(state: StoredState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

function freshState(): StoredState {
  return {
    n: HOME_GREETING_FACT_COUNT,
    permutation: shuffleIndices(HOME_GREETING_FACT_COUNT),
    cursor: 0,
  }
}

/**
 * Следующий факт из очереди без повторов до прохода всех N строк.
 * Вызывать при показе полного приветствия на стартовом экране.
 */
export function consumeNextGreetingFactLine(): string {
  let state = readState()
  if (!state) {
    state = freshState()
    writeState(state)
  }

  const idx = state.permutation[state.cursor]!
  const line = HOME_GREETING_FACTS[idx] ?? HOME_GREETING_FACTS[0]!

  let nextCursor = state.cursor + 1
  let perm = state.permutation
  if (nextCursor >= HOME_GREETING_FACT_COUNT) {
    perm = shuffleIndices(HOME_GREETING_FACT_COUNT)
    nextCursor = 0
  }

  writeState({
    n: HOME_GREETING_FACT_COUNT,
    permutation: perm,
    cursor: nextCursor,
  })

  return line
}
