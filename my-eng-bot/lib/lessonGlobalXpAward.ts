/**
 * Глобальный XP за урок: только прирост относительно bestTotalXp (core + combo).
 */

export function resolveGlobalLessonXpDelta(params: {
  sessionTotalXp: number
  previousBestTotalXp: number
  alreadyAwardedThisRun: number
}): { amount: number; entitledTotal: number } {
  const sessionTotal = Math.max(0, Math.floor(params.sessionTotalXp))
  const previousBest = Math.max(0, Math.floor(params.previousBestTotalXp))
  const alreadyAwarded = Math.max(0, Math.floor(params.alreadyAwardedThisRun))
  const entitledTotal = Math.max(0, sessionTotal - previousBest)
  const amount = Math.max(0, entitledTotal - alreadyAwarded)
  return { amount, entitledTotal }
}
