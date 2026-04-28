const HOME_VOICE_LINES = [
  'Я снова здесь. Продолжим?',
  'С чего начнем сегодня?',
  'Рад вас видеть. Готов помочь.',
  'У нас сегодня будет хороший английский.',
  'Начнем с легкого шага?',
  'Я рядом. Давайте спокойно.',
  'Готов поддержать вас сегодня.',
  'Посмотрим, куда пойдем сегодня.',
] as const

const STORAGE_KEY = 'myeng-home-voice-rotation-v1'

type StoredState = {
  n: number
  permutation: number[]
  cursor: number
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, index) => index)
  for (let index = n - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[arr[index], arr[randomIndex]] = [arr[randomIndex], arr[index]]
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
      data.n !== HOME_VOICE_LINES.length ||
      data.permutation.length !== HOME_VOICE_LINES.length
    ) {
      return null
    }
    const uniqueValues = new Set(data.permutation)
    if (uniqueValues.size !== HOME_VOICE_LINES.length) return null
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
    // ignore quota errors
  }
}

function freshState(): StoredState {
  return {
    n: HOME_VOICE_LINES.length,
    permutation: shuffleIndices(HOME_VOICE_LINES.length),
    cursor: 0,
  }
}

export function consumeNextHomeVoiceLine(): string {
  let state = readState()
  if (!state) {
    state = freshState()
    writeState(state)
  }

  const nextIndex = state.permutation[state.cursor] ?? 0
  const line = HOME_VOICE_LINES[nextIndex] ?? HOME_VOICE_LINES[0]

  let nextCursor = state.cursor + 1
  let nextPermutation = state.permutation
  if (nextCursor >= HOME_VOICE_LINES.length) {
    nextPermutation = shuffleIndices(HOME_VOICE_LINES.length)
    nextCursor = 0
  }

  writeState({
    n: HOME_VOICE_LINES.length,
    permutation: nextPermutation,
    cursor: nextCursor,
  })

  return line
}
