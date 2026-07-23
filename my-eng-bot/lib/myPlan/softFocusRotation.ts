const STORAGE_KEY = 'engvo.myPlan.softFocusRecentKeys'
const MAX_RECENT = 3

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Pure: pick first candidate key not in recent; if all excluded, reset and take first. */
export function pickSoftFocusKey(
  orderedKeys: string[],
  recentSoftKeys: string[] | null | undefined
): string | null {
  if (orderedKeys.length === 0) return null
  const recent = recentSoftKeys ?? []
  const fresh = orderedKeys.find((k) => !recent.includes(k))
  return fresh ?? orderedKeys[0] ?? null
}

export function pushRecentSoftKey(recent: string[], key: string, max = MAX_RECENT): string[] {
  const next = [key, ...recent.filter((k) => k !== key)]
  return next.slice(0, max)
}

export function readRecentSoftKeys(): string[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((k): k is string => typeof k === 'string').slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function writeRecentSoftKeys(keys: string[]): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.slice(0, MAX_RECENT)))
  } catch {
    // ignore quota / private mode
  }
}

export function recordSoftFocusShown(key: string): string[] {
  const next = pushRecentSoftKey(readRecentSoftKeys(), key)
  writeRecentSoftKeys(next)
  return next
}

export { STORAGE_KEY as SOFT_FOCUS_STORAGE_KEY, MAX_RECENT as SOFT_FOCUS_MAX_RECENT }
