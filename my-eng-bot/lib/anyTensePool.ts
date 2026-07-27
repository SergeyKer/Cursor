/**
 * Пул и резолвер «Любое время» (tense=`all`):
 * фаза 1 — unseen CORE5 ∩ CEFR ∩ audience;
 * фаза 2 — полный concrete CEFR-пул после исчерпания ядра.
 */

import { allowedTensesForAudience } from '@/lib/levelAllowedTenses'
import { pickWeightedFreeTalkTense } from '@/lib/freeTalkDialogueTense'
import type { Audience, LevelId, SentenceType, TenseId } from '@/lib/types'

/** Разговорное ядро для меню «Любое». */
export const ANY_CORE5: readonly TenseId[] = [
  'present_simple',
  'present_continuous',
  'past_simple',
  'future_simple',
  'present_perfect',
] as const

const CONCRETE_TENSE_IDS = new Set<TenseId>([
  'present_simple',
  'present_continuous',
  'present_perfect',
  'present_perfect_continuous',
  'past_simple',
  'past_continuous',
  'past_perfect',
  'past_perfect_continuous',
  'future_simple',
  'future_continuous',
  'future_perfect',
  'future_perfect_continuous',
])

const SENTENCE_TYPES = new Set<SentenceType>(['general', 'interrogative', 'negative', 'mixed'])

const KNOWN_LEVELS = new Set<LevelId>(['all', 'starter', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'])

export type AnyDrillAxis = {
  tense: TenseId
  effectiveLevel: LevelId
  effectiveSentenceType: SentenceType
}

export type AnyTensePhase = 'core' | 'full'

/** Concrete CEFR∩audience без meta `all`. */
export function resolveConcreteCefrPool(level: LevelId | string, audience: Audience): TenseId[] {
  return allowedTensesForAudience(level, audience).filter((id) => id !== 'all' && CONCRETE_TENSE_IDS.has(id))
}

export function resolveAnyCorePool(level: LevelId | string, audience: Audience): TenseId[] {
  const cefr = new Set(resolveConcreteCefrPool(level, audience))
  return ANY_CORE5.filter((id) => cefr.has(id))
}

export function isAnyCoreExhausted(corePool: readonly TenseId[], usedTenses: readonly string[]): boolean {
  if (corePool.length === 0) return true
  const used = new Set(usedTenses.filter(Boolean))
  return corePool.every((t) => used.has(t))
}

/**
 * Two-phase candidates для «Любое»:
 * пока в used не все из corePool — только unseen core (или весь core, если unseen пуст);
 * после exhaust — full concrete CEFR pool.
 */
export function resolveAnyTensePool(params: {
  level: LevelId | string
  audience: Audience
  usedTenses?: readonly string[] | null
}): { candidates: TenseId[]; phase: AnyTensePhase; corePool: TenseId[] } {
  const used = sanitizeUsedAnyTenses(params.usedTenses)
  const corePool = resolveAnyCorePool(params.level, params.audience)
  const fullPool = resolveConcreteCefrPool(params.level, params.audience)
  const fallback: TenseId[] = fullPool.length > 0 ? fullPool : ['present_simple']

  if (!isAnyCoreExhausted(corePool, used)) {
    const unseen = corePool.filter((t) => !used.includes(t))
    const candidates = (unseen.length > 0 ? unseen : corePool.length > 0 ? corePool : fallback) as TenseId[]
    return { candidates, phase: 'core', corePool }
  }

  return {
    candidates: fullPool.length > 0 ? fullPool : fallback,
    phase: 'full',
    corePool,
  }
}

/** Concrete ids для меню + meta `all` (всегда, на любом CEFR). */
export function withAnyTenseMenuOption(concreteIds: readonly TenseId[]): TenseId[] {
  const concrete = concreteIds.filter((id) => id !== 'all' && CONCRETE_TENSE_IDS.has(id))
  return ['all', ...concrete]
}

export function sanitizeUsedAnyTenses(raw: unknown, max = 12): TenseId[] {
  if (!Array.isArray(raw)) return []
  const out: TenseId[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim() as TenseId
    if (id === 'all' || !CONCRETE_TENSE_IDS.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

function normalizeLevel(level: unknown): LevelId | null {
  if (typeof level !== 'string') return null
  const id = level.trim() as LevelId
  return KNOWN_LEVELS.has(id) ? id : null
}

function normalizeSentenceType(value: unknown): SentenceType | null {
  if (typeof value !== 'string') return null
  const id = value.trim() as SentenceType
  return SENTENCE_TYPES.has(id) ? id : null
}

/**
 * Валидация client drill axis. Invalid/stale → null (caller делает pickInitial).
 * `menuLevel` / `menuSentenceType` — активные настройки меню; effective может быть
 * уже разрешённым (level=all → a2, mixed → general), но должен быть допустим.
 */
export function validateAnyDrillAxis(
  raw: unknown,
  params: {
    audience: Audience
    menuLevel: LevelId | string
    menuSentenceType: SentenceType
  }
): AnyDrillAxis | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const tense = typeof obj.tense === 'string' ? (obj.tense.trim() as TenseId) : null
  if (!tense || tense === 'all' || !CONCRETE_TENSE_IDS.has(tense)) return null

  const effectiveLevel = normalizeLevel(obj.effectiveLevel)
  if (!effectiveLevel || effectiveLevel === 'all') return null

  const effectiveSentenceType = normalizeSentenceType(obj.effectiveSentenceType)
  if (!effectiveSentenceType) return null

  // Concrete type must match menu, or be a resolved concrete from mixed.
  if (params.menuSentenceType !== 'mixed' && effectiveSentenceType !== params.menuSentenceType) {
    return null
  }
  if (params.menuSentenceType === 'mixed' && effectiveSentenceType === 'mixed') {
    return null
  }

  const allowedAtEffective = new Set(resolveConcreteCefrPool(effectiveLevel, params.audience))
  if (!allowedAtEffective.has(tense)) return null

  // Effective level must not exceed menu CEFR (menu `all` allows any known concrete level).
  const menuLevel = normalizeLevel(params.menuLevel) ?? 'a1'
  if (menuLevel !== 'all') {
    const menuAllowed = new Set(resolveConcreteCefrPool(menuLevel, params.audience))
    const effectiveIsSubsetOfMenu = [...allowedAtEffective].every((t) => menuAllowed.has(t))
    if (!effectiveIsSubsetOfMenu) return null
  }

  return { tense, effectiveLevel, effectiveSentenceType }
}

/** Выбрать concrete tense из two-phase пула. */
export function pickAnyTenseForTurn(params: {
  level: LevelId | string
  audience: Audience
  usedTenses?: readonly string[] | null
  seed: string
  excludeTense?: string | null
}): { tense: TenseId; phase: AnyTensePhase; candidates: TenseId[] } {
  const { candidates, phase } = resolveAnyTensePool({
    level: params.level,
    audience: params.audience,
    usedTenses: params.usedTenses,
  })
  const tense = pickWeightedFreeTalkTense({
    candidates,
    seed: params.seed,
    excludeTense: params.excludeTense,
  }) as TenseId
  return { tense, phase, candidates }
}
