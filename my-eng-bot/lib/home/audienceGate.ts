const STORAGE_KEY = 'myeng_home_audience_chosen_v1'

export function loadHomeAudienceChosen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveHomeAudienceChosen(chosen: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (chosen) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore quota */
  }
}
