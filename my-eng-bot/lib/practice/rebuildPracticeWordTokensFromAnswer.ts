function tokenMultiset(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokens) {
    const key = token.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function practiceWordMultisetsEqual(left: string[], right: string[]): boolean {
  const a = tokenMultiset(left)
  const b = tokenMultiset(right)
  if (a.size !== b.size) return false
  for (const [token, count] of a) {
    if (b.get(token) !== count) return false
  }
  return true
}

export function tokensFromTargetAnswer(targetAnswer: string): string[] {
  return targetAnswer
    .replace(/[.!?]$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
}

/** Pedagogical token order for puzzle correctOrder; prefers shuffledWords when multiset matches target. */
export function rebuildPracticeWordTokensFromAnswer(
  targetAnswer: string,
  shuffledWords?: string[]
): string[] {
  const answerTokens = tokensFromTargetAnswer(targetAnswer)
  const shuffled = (shuffledWords ?? []).map((word) => word.trim()).filter(Boolean)
  if (shuffled.length > 0 && practiceWordMultisetsEqual(shuffled, answerTokens)) {
    return shuffled
  }
  return answerTokens
}
