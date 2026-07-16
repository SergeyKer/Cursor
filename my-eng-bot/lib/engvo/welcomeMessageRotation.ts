import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import type { Audience } from '@/lib/types'

/** Очень короткие фразы для A1: нажать зелёную трубку (child и adult). */
export const ENGVO_WELCOME_LINES_A1 = [
  'Нажми зелёную кнопку. Поговорим по-английски.',
  'Нажми зелёную трубку - начнём говорить по-английски.',
  'Готов? Нажми зелёную кнопку. Будем говорить по-английски.',
  'Нажми зелёную кнопку с трубкой. Поговорим на английском.',
  'Когда готов - нажми зелёную кнопку. Поговорим по-английски.',
] as const

/** Простой русский: приглашение на звонок (child). */
export const ENGVO_WELCOME_LINES_CHILD = [
  'Привет! Нажми зелёную кнопку с трубкой - начнём говорить по-английски.',
  'Привет! Когда будешь готов, нажми зелёную трубку - поговорим по-английски.',
  'Здравствуй! Нажми зелёную кнопку - я помогу тебе говорить по-английски.',
  'Привет, друг! Готов? Нажми зелёную трубку - будем практиковаться вместе.',
  'Добро пожаловать! Нажми зелёную кнопку, когда захочешь начать разговор.',
] as const

/** Простой русский: приглашение на звонок (adult). */
export const ENGVO_WELCOME_LINES_ADULT = [
  'Здравствуйте. Нажмите зелёную иконку трубки, когда будете готовы - поговорим на английском.',
  'Здравствуйте. Нажмите зелёную кнопку звонка - будем говорить по шагам.',
  'Рад вас видеть. Начните звонок зелёной кнопкой - поговорим по-английски.',
  'Здравствуйте. Нажмите зелёную трубку, когда будете готовы начать разговор.',
  'Здравствуйте. Нажмите зелёную кнопку звонка - я здесь для спокойной практики английского.',
] as const

/** Teacher mode: short RU invite to start an exercise (not free chat). */
export const ENGVO_TEACHER_WELCOME_LINES_A1 = [
  'Нажми зелёную кнопку. Начнём упражнение.',
  'Готов? Нажми зелёную трубку - начнём практику перевода.',
  'Нажми зелёную кнопку с трубкой. Будем переводить вслух.',
] as const

export const ENGVO_TEACHER_WELCOME_LINES_CHILD = [
  'Привет! Нажми зелёную трубку - начнём упражнение на перевод.',
  'Привет! Когда будешь готов, нажми зелёную кнопку - будем переводить вместе.',
  'Здравствуй! Нажми зелёную кнопку - начнём практику.',
] as const

export const ENGVO_TEACHER_WELCOME_LINES_ADULT = [
  'Здравствуйте. Нажмите зелёную трубку — начнём упражнение.',
  'Здравствуйте. Нажмите зелёную кнопку звонка — начнём практику перевода вслух.',
  'Здравствуйте. Нажмите зелёную трубку, когда будете готовы к упражнению.',
] as const

const STORAGE_KEY = 'myeng-engvo-welcome-rotation-v2'

type RotationKey = 'a1' | 'child' | 'adult'

type RotationSlice = {
  n: number
  permutation: number[]
  cursor: number
}

type StoredState = {
  a1: RotationSlice | null
  child: RotationSlice | null
  adult: RotationSlice | null
}

function rotationKey(audience: Audience, level?: EngvoCefrLevel): RotationKey {
  if (level === 'a1') return 'a1'
  return audience === 'child' ? 'child' : 'adult'
}

function linesForKey(key: RotationKey): readonly string[] {
  if (key === 'a1') return ENGVO_WELCOME_LINES_A1
  return key === 'child' ? ENGVO_WELCOME_LINES_CHILD : ENGVO_WELCOME_LINES_ADULT
}

function poolSize(key: RotationKey): number {
  return linesForKey(key).length
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
    return {
      a1: data.a1 ?? null,
      child: data.child ?? null,
      adult: data.adult ?? null,
    }
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
 * Следующая строка приветствия Engvo без повторов до прохода всего пула.
 * При level A1 - отдельный короткий пул; иначе child/adult.
 */
export function consumeNextEngvoWelcomeMessage(audience: Audience, level?: EngvoCefrLevel): string {
  const key = rotationKey(audience, level)
  const n = poolSize(key)
  const lines = linesForKey(key)

  const stored = readState() ?? { a1: null, child: null, adult: null }
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
    a1: key === 'a1' ? nextSlice : stored.a1,
    child: key === 'child' ? nextSlice : stored.child,
    adult: key === 'adult' ? nextSlice : stored.adult,
  })

  return line
}

/** Fixed short welcome for teacher format (separate from free-call rotation). */
export function consumeNextEngvoTeacherWelcomeMessage(
  audience: Audience,
  level?: EngvoCefrLevel
): string {
  if (level === 'a1') {
    const i = Math.floor(Math.random() * ENGVO_TEACHER_WELCOME_LINES_A1.length)
    return ENGVO_TEACHER_WELCOME_LINES_A1[i]!
  }
  if (audience === 'child') {
    const i = Math.floor(Math.random() * ENGVO_TEACHER_WELCOME_LINES_CHILD.length)
    return ENGVO_TEACHER_WELCOME_LINES_CHILD[i]!
  }
  const i = Math.floor(Math.random() * ENGVO_TEACHER_WELCOME_LINES_ADULT.length)
  return ENGVO_TEACHER_WELCOME_LINES_ADULT[i]!
}
