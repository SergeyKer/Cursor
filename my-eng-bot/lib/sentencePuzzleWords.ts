/** Слова для пазла шага 5: утверждения без плитки «.»; «?» и «!» - отдельными плитками. */
export function toSentencePuzzleCards(sentence: string): string[] {
  const trimmed = sentence.trim()
  const endsWithQuestion = trimmed.endsWith('?')
  const endsWithExclamation = trimmed.endsWith('!')

  let normalized = trimmed
  if (!endsWithQuestion && !endsWithExclamation) {
    normalized = normalized.replace(/\.+$/u, '').trim()
  } else {
    normalized = normalized.replace(/([?!])/gu, ' $1')
  }

  return normalized.split(/\s+/u).filter(Boolean)
}
