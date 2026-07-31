export type SessionExitHistoryState = {
  engvoSessionExit?: 1
}

export function isSessionExitHistoryState(state: unknown): state is SessionExitHistoryState {
  return Boolean(
    state &&
      typeof state === 'object' &&
      (state as SessionExitHistoryState).engvoSessionExit === 1
  )
}

/** Push one guard entry without changing the URL (deeplink-safe). */
export function pushSessionExitHistoryGuard(): void {
  if (typeof window === 'undefined') return
  if (isSessionExitHistoryState(window.history.state)) return
  const current = window.history.state
  const next: SessionExitHistoryState = {
    ...(current && typeof current === 'object' ? (current as object) : {}),
    engvoSessionExit: 1,
  }
  window.history.pushState(next, '', window.location.href)
}

/**
 * Strip marker from current state without popping (keeps stack length).
 * Prefer consumeSessionExitHistoryGuard + ignorePop when leaving a session.
 */
export function stripSessionExitHistoryGuard(): void {
  if (typeof window === 'undefined') return
  if (!isSessionExitHistoryState(window.history.state)) return
  const current = window.history.state as SessionExitHistoryState & Record<string, unknown>
  const { engvoSessionExit: _drop, ...rest } = current
  window.history.replaceState(rest, '', window.location.href)
}
