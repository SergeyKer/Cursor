const PREF_KEY = 'engvo_communication_auto_tts'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getCommunicationAutoTtsPref(): boolean {
  if (!canUseStorage()) return false
  try {
    return window.localStorage.getItem(PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function setCommunicationAutoTtsPref(enabled: boolean): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}
