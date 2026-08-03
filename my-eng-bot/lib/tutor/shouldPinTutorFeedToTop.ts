/** Whether Tutor feed should keep viewport at top (first explain reading), like lesson step 1. */
export function shouldPinTutorFeedToTop(
  thread: Array<{ explain?: unknown }>,
  lastExplain: unknown | null
): boolean {
  const explainIndexes: number[] = []
  for (let i = 0; i < thread.length; i++) {
    if (thread[i]?.explain) explainIndexes.push(i)
  }
  if (explainIndexes.length > 1) return false
  if (explainIndexes.length === 1) {
    return explainIndexes[0] === thread.length - 1
  }
  // No explain markers on messages: fresh pre-explain → top; restore with lastExplain → tail
  if (lastExplain != null) return false
  return true
}
