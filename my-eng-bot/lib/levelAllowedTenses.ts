import { TENSES, CHILD_TENSES } from '@/lib/constants'
import type { LevelId, TenseId } from '@/lib/types'

const ALL_TENSE_IDS: TenseId[] = TENSES.map((t) => t.id)

const KNOWN_LEVELS = new Set<LevelId>([
  'all',
  'starter',
  'a1',
  'a2',
  'b1',
  'b2',
  'c1',
  'c2',
])

/**
 * Кумулятивные времёна по CEFR (в духе LEVEL_PROFILES в API): на уровне доступны
 * только то, что введено на нём и ниже. Пункт `all` — только при level === `all`.
 */
const LEVEL_ORDER: Exclude<LevelId, 'all'>[] = ['starter', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2']

const ADDITIONS: Record<Exclude<LevelId, 'all'>, TenseId[]> = {
  starter: ['present_simple'],
  a1: ['present_continuous'],
  a2: ['past_simple', 'future_simple'],
  b1: ['present_perfect', 'past_continuous', 'future_continuous'],
  b2: ['past_perfect', 'future_perfect', 'present_perfect_continuous'],
  c1: ['past_perfect_continuous', 'future_perfect_continuous'],
  c2: [],
}

function cumulativeTensesUpTo(target: Exclude<LevelId, 'all'>): TenseId[] {
  const out: TenseId[] = []
  for (const lid of LEVEL_ORDER) {
    out.push(...ADDITIONS[lid])
    if (lid === target) break
  }
  return out
}

function normalizeLevelKey(level: string): LevelId {
  if (KNOWN_LEVELS.has(level as LevelId)) return level as LevelId
  return 'a1'
}

/** Допустимые `TenseId` для уровня. Для неизвестного `level` — как для `a1`. */
export function getAllowedTensesForLevel(level: LevelId | string): TenseId[] {
  const id = typeof level === 'string' ? normalizeLevelKey(level) : level
  if (!KNOWN_LEVELS.has(id)) return cumulativeTensesUpTo('a1')
  if (id === 'all') return [...ALL_TENSE_IDS]
  return cumulativeTensesUpTo(id)
}

/** Первое время из `current`, попадающее в `allowed`, иначе `fallback`. */
export function normalizeSingleTenseSelection(
  current: TenseId[],
  allowed: TenseId[],
  fallback: TenseId = 'present_simple'
): TenseId[] {
  const allowedSet = new Set(allowed)
  const pick = current.find((t) => allowedSet.has(t)) ?? fallback
  return [pick]
}

const CHILD_TENSE_SET = new Set<TenseId>(CHILD_TENSES)

/** Пересечение с `CHILD_TENSES` для аудитории «ребёнок». */
export function allowedTensesForAudience(level: LevelId | string, audience: 'child' | 'adult'): TenseId[] {
  const base = getAllowedTensesForLevel(level)
  if (audience !== 'child') return base
  return base.filter((id) => CHILD_TENSE_SET.has(id))
}
