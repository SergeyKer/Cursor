import type { Audience } from '@/lib/types'

/** Короткие A2-фразы: приглашение нажать зелёную трубку (child). */
export const ENGVO_WELCOME_LINES_CHILD = [
  "Hi! Tap the green button and let's talk in English. I'm here to help.",
  "Hello! When you're ready, press the green phone and we can chat.",
  "Hey there! Hit the green call button — I'd love to hear you speak English.",
  "Hi, friend! Ready? Tap the green phone and we'll practice together.",
  "Welcome! Press the green button when you want to start our voice chat.",
] as const

/** Короткие A2-фразы: приглашение на звонок (adult). */
export const ENGVO_WELCOME_LINES_ADULT = [
  'Hello. When you are ready, tap the green phone icon and we will speak in English.',
  'Hi there. Press the green call button to connect — we will take it step by step.',
  'Good to see you. Start the call with the green button and we can chat in English.',
  'Hello. Tap the green phone when you are ready to begin our voice session.',
  'Hi. Use the green call button to join — I am here for a calm English chat.',
] as const

const STORAGE_KEY = 'myeng-engvo-welcome-rotation-v1'

type RotationSlice = {
  n: number
  permutation: number[]
  cursor: number
}

type StoredState = {
  child: RotationSlice | null
  adult: RotationSlice | null
}

function linesForAudience(audience: Audience): readonly string[] {
  return audience === 'child' ? ENGVO_WELCOME_LINES_CHILD : ENGVO_WELCOME_LINES_ADULT
}

function poolSize(audience: Audience): number {
  return linesForAudience(audience).length
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function freshSlice(n: number): RotationSlice {
  return {
    n,
    permutation: shuffleIndices(n),
    cursor: 0,
  }
}

function isValidSlice(slice: RotationSlice | null, expectedN: number): slice is RotationSlice {
  if (!slice || slice.n !== expectedN || !Array.isArray(slice.permutation)) return false
  if (slice.permutation.length !== expectedN || typeof slice.cursor !== 'number') return false
  if (slice.cursor < 0 || slice.cursor >= expectedN) return false
  const set = new Set(slice.permutation)
  if (set.size !== expectedN) return false
  for (let i = 0; i < expectedN; i++) {
    if (!set.has(i)) return false
  }
  return true
}

function readState(): StoredState | null {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<StoredState>
    const child = data.child ?? null
    const adult = data.adult ?? null
    return { child, adult }
  } catch {
    return null
  }
}

function writeState(state: StoredState): void {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

/**
 * Следующая строка приветствия Engvo без повторов до прохода всего пула (отдельно child/adult).
 */
export function consumeNextEngvoWelcomeMessage(audience: Audience): string {
  const n = poolSize(audience)
  const lines = linesForAudience(audience)

  const stored = readState() ?? { child: null, adult: null }
  const key = audience === 'child' ? 'child' : 'adult'
  let slice = stored[key]
  if (!isValidSlice(slice, n)) {
    slice = freshSlice(n)
  }

  const idx = slice.permutation[slice.cursor]!
  const line = lines[idx] ?? lines[0]!

  let nextCursor = slice.cursor + 1
  let perm = slice.permutation
  if (nextCursor >= n) {
    perm = shuffleIndices(n)
    nextCursor = 0
  }

  const nextSlice: RotationSlice = { n, permutation: perm, cursor: nextCursor }
  writeState({
    child: key === 'child' ? nextSlice : stored.child,
    adult: key === 'adult' ? nextSlice : stored.adult,
  })

  return line
}
