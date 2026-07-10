const TERMINAL_PUNCT_RE = /[.?!…]/g
const WORD_TOKEN_RE = /[A-Za-zА-Яа-яЁё]+(?:'[A-Za-zА-Яа-яЁё]+)?/g

/** Max chars sent to punctuate API. */
export const STT_PUNCTUATE_MAX_CHARS = 500

export function truncateForSttPunctuate(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= STT_PUNCTUATE_MAX_CHARS) return trimmed
  return trimmed.slice(0, STT_PUNCTUATE_MAX_CHARS).trim()
}

/**
 * True when Web Speech / partial Whisper text likely needs punctuation pass.
 * Skip when already adequately punctuated.
 */
export function needsPunctuationPass(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length < 2) return false
  if (!/[A-Za-zА-Яа-яЁё]/.test(normalized)) return false

  const terminals = normalized.match(TERMINAL_PUNCT_RE)
  if (!terminals || terminals.length === 0) return true

  const words = normalized.match(WORD_TOKEN_RE) ?? []
  if (words.length === 0) return false

  // Long run of words with no terminal punctuation between them.
  const segments = normalized.split(/[.?!…]+/).map((s) => s.trim()).filter(Boolean)
  for (const segment of segments) {
    const segmentWords = segment.match(WORD_TOKEN_RE) ?? []
    if (segmentWords.length >= 8) return true
  }

  return false
}

/** Word tokens for identity guard (casefold, punctuation stripped). */
export function tokenizeForWordGuard(text: string): string[] {
  const matches = text.toLowerCase().match(WORD_TOKEN_RE)
  return matches ?? []
}

export function wordsIdentityEqual(original: string, candidate: string): boolean {
  const a = tokenizeForWordGuard(original)
  const b = tokenizeForWordGuard(candidate)
  if (a.length !== b.length) return false
  return a.every((token, i) => token === b[i])
}

/**
 * Keep candidate only if it preserves word identity (punctuation/casing may differ).
 * Otherwise return original.
 */
export function preserveWordsOnlyPunctuation(original: string, candidate: string): string {
  const trimmedOriginal = original.trim()
  const trimmedCandidate = candidate.trim()
  if (!trimmedCandidate) return trimmedOriginal
  if (!trimmedOriginal) return trimmedCandidate
  if (!wordsIdentityEqual(trimmedOriginal, trimmedCandidate)) return trimmedOriginal
  return trimmedCandidate
}
