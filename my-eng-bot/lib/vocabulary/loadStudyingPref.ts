const PREF_KEY = 'engvo_vocab_load_studying'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Default ON — smart mix when starting Translation / Call. */
export function getLoadStudyingPref(): boolean {
  if (!canUseStorage()) return true
  try {
    const raw = window.localStorage.getItem(PREF_KEY)
    if (raw === null) return true
    return raw !== '0' && raw !== 'false'
  } catch {
    return true
  }
}

export function setLoadStudyingPref(on: boolean): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(PREF_KEY, on ? '1' : '0')
  } catch {
    // ignore
  }
}
