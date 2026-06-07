function revealStorageKey(sessionId: string, revealKey: string): string {
  return `practice-revealed:${sessionId}:${revealKey}`
}

export function isPracticeQuestionRevealed(sessionId: string, revealKey: string): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(revealStorageKey(sessionId, revealKey)) === '1'
  } catch {
    return false
  }
}

export function markPracticeQuestionRevealed(sessionId: string, revealKey: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(revealStorageKey(sessionId, revealKey), '1')
  } catch {
    // ignore quota / private mode
  }
}
