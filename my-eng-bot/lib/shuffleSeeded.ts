/**
 * Детерминированное перемешивание: один и тот же seed даёт один и тот же порядок
 * (удобно для UI без смены порядка при каждом ре-рендере).
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i)
  }
  let state = Math.abs(hash) || 1
  const random = () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    return state / 4294967296
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = result[i]!
    result[i] = result[j]!
    result[j] = tmp
  }
  return result
}
