const STORAGE_KEY = 'engvo.openReferenceLessonId'

/** Persist intent for same-tab handoff (My Plan / deep link). */
export function stashOpenReferenceLessonId(lessonId: string): void {
  const id = lessonId.trim()
  if (!id || typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function consumeOpenReferenceLessonId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const id = sessionStorage.getItem(STORAGE_KEY)?.trim() || null
    if (id) sessionStorage.removeItem(STORAGE_KEY)
    return id
  } catch {
    return null
  }
}

/** Parse ?reference=lessonId from location search. */
export function readReferenceLessonIdFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    const id = params.get('reference')?.trim() || params.get('topic')?.trim() || null
    return id || null
  } catch {
    return null
  }
}
