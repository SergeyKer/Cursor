import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import type { Audience } from '@/lib/types'

export const TEACHER_OPENING_SEEDS_ADULT_RU = [
  'Здравствуйте — давайте потренируем вслух.',
  'Добрый день. Готовы к короткой практике?',
  'Здравствуйте. Сейчас несколько фраз вслух.',
  'Рад вас слышать. Начнём с перевода вслух.',
] as const

export const TEACHER_OPENING_SEEDS_CHILD_RU = [
  'Привет! Давай потренируем вслух.',
  'Привет! Сейчас пару фраз по-английски.',
  'Здравствуй! Готов чуть попрактиковаться?',
] as const

export const TEACHER_OPENING_SEEDS_B1_EN = [
  'Hi — let’s practice out loud.',
  'Hello. Ready for a few lines out loud?',
  'Good to hear you. Let’s translate a few aloud.',
] as const

export const FREE_OPENING_SEEDS_ADULT = [
  'Hi — nice to hear you.',
  'Hello. Let’s chat for a bit.',
  'Hi there. Ready when you are.',
] as const

export const FREE_OPENING_SEEDS_CHILD = [
  'Hi! Let’s talk a little.',
  'Hello! I’m glad you’re here.',
  'Hi — shall we chat?',
] as const

export const FREE_OPENING_SEEDS_A1 = [
  'Hi! Let’s talk.',
  'Hello! Let’s start.',
  'Hi — ready?',
] as const

export function pickOpeningSeed(
  pool: readonly string[],
  seedIndex?: number
): string {
  if (pool.length === 0) return ''
  const index =
    typeof seedIndex === 'number' && Number.isFinite(seedIndex)
      ? ((Math.trunc(seedIndex) % pool.length) + pool.length) % pool.length
      : Math.floor(Math.random() * pool.length)
  return pool[index]!
}

export function resolveTeacherOpeningPool(
  level: EngvoCefrLevel,
  audience: Audience
): readonly string[] {
  if (level !== 'a1' && level !== 'a2') return TEACHER_OPENING_SEEDS_B1_EN
  return audience === 'child' ? TEACHER_OPENING_SEEDS_CHILD_RU : TEACHER_OPENING_SEEDS_ADULT_RU
}

export function resolveFreeOpeningPool(
  level: EngvoCefrLevel,
  audience: Audience
): readonly string[] {
  if (level === 'a1') return FREE_OPENING_SEEDS_A1
  return audience === 'child' ? FREE_OPENING_SEEDS_CHILD : FREE_OPENING_SEEDS_ADULT
}

/** Preferred opening line for first-turn realtime instructions. */
export function buildPreferredOpeningInstruction(
  seed: string
): string {
  return [
    `Preferred opening this turn: "${seed}".`,
    'You may use a close natural variant of the same length and tone; then immediately do the next required step.',
    'Keep the greeting short; do not add a second greeting or a long preamble.',
    'The opening must not include a drill sentence, Переведи, Translate, Скажи, You meant, so:/not ERROR contrast, or the topic question itself.',
  ].join(' ')
}
