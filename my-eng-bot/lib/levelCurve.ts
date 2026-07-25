/** Арифметическая кривая уровней: xpToNext(L) = BASE + STEP * L. */

export const LEVEL_XP_BASE = 80
export const LEVEL_XP_STEP = 20

/** Прирост в кумулятиве: T(N) = (N-1)*(BASE + (STEP/2)*N). */
const LEVEL_XP_CUMULATIVE_COEFF = LEVEL_XP_STEP / 2

export type LevelView = {
  level: number
  currentLevelXP: number
  xpToNextLevel: number
}

export function normalizeTotalXp(totalXP: number): number {
  if (!Number.isFinite(totalXP)) return 0
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(totalXP)))
}

export function xpBarForLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  return LEVEL_XP_BASE + LEVEL_XP_STEP * safeLevel
}

/**
 * Кумулятивный XP, нужный чтобы стать уровнем `level` (закрыть полоски 1..level-1).
 * T(N) = (N - 1) * (80 + 10N) = 10N² + 70N − 80.
 */
export function totalXpToReachLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  if (safeLevel <= 1) return 0
  const a = safeLevel - 1
  const b = LEVEL_XP_BASE + LEVEL_XP_CUMULATIVE_COEFF * safeLevel
  if (a > 0 && b > Number.MAX_SAFE_INTEGER / a) {
    return Number.MAX_SAFE_INTEGER
  }
  return Math.min(Number.MAX_SAFE_INTEGER, a * b)
}

function estimateLevelFromXp(safeXp: number): number {
  // Inverse of T(N)=10N²+70N-80: L = floor((-70 + sqrt(8100 + 40*XP)) / 20)
  const disc = 8100 + 40 * safeXp
  const raw = (-70 + Math.sqrt(disc)) / 20
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.max(1, Math.floor(raw))
}

export function calculateLevelFromTotalXp(totalXP: number): LevelView {
  const safeXp = normalizeTotalXp(totalXP)
  let level = estimateLevelFromXp(safeXp)

  while (level > 1 && totalXpToReachLevel(level) > safeXp) {
    level -= 1
  }

  for (let guard = 0; guard < 8; guard += 1) {
    const nextThreshold = totalXpToReachLevel(level + 1)
    if (nextThreshold > safeXp) break
    if (nextThreshold === Number.MAX_SAFE_INTEGER && totalXpToReachLevel(level) >= safeXp) break
    level += 1
  }

  const reached = totalXpToReachLevel(level)
  const xpToNextLevel = xpBarForLevel(level)
  const currentLevelXP = Math.min(xpToNextLevel - 1, Math.max(0, safeXp - reached))

  return {
    level,
    currentLevelXP,
    xpToNextLevel,
  }
}
