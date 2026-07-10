const TERMINAL_PUNCT_RE = /[.?!…]/g
const WORD_TOKEN_RE = /[A-Za-zА-Яа-яЁё]+(?:'[A-Za-zА-Яа-яЁё]+)?/g

const GREETING_WORDS = new Set(['hello', 'hi', 'привет'])
const QUESTION_START_WORDS = new Set([
  'what',
  'who',
  'where',
  'when',
  'why',
  'how',
  'что',
  'кто',
  'где',
  'когда',
  'почему',
  'как',
])

type ClauseKind = 'greeting' | 'question' | 'statement'

/** Max chars sent to punctuate API. */
export const STT_PUNCTUATE_MAX_CHARS = 500

export function truncateForSttPunctuate(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= STT_PUNCTUATE_MAX_CHARS) return trimmed
  return trimmed.slice(0, STT_PUNCTUATE_MAX_CHARS).trim()
}

export function hasTerminalPunctuation(text: string): boolean {
  return /[.?!…]/.test(text)
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

function foldWord(word: string): string {
  return word.toLowerCase()
}

function capitalizeWord(word: string): string {
  if (!word) return word
  const first = word.charAt(0)
  const upper = first.toLocaleUpperCase()
  if (upper === first) return word
  return upper + word.slice(1)
}

function detectClauseKind(words: string[], index: number): ClauseKind | null {
  const current = foldWord(words[index] ?? '')
  if (!current) return null

  if (index === 0) {
    if (GREETING_WORDS.has(current)) return 'greeting'
    if (QUESTION_START_WORDS.has(current)) return 'question'
    return 'statement'
  }

  if (QUESTION_START_WORDS.has(current)) return 'question'
  if (current === "i'm") return 'statement'
  if (current === 'i' && foldWord(words[index + 1] ?? '') === 'am') return 'statement'
  if (current === 'my' && foldWord(words[index + 1] ?? '') === 'name') return 'statement'
  return null
}

function terminalForKind(kind: ClauseKind): string {
  if (kind === 'greeting') return '!'
  if (kind === 'question') return '?'
  return '.'
}

/**
 * Deterministic punctuation/casing without changing word tokens.
 * Used when LLM punctuate fails or rewrites learner words.
 */
export function applyLocalSttPunctuation(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const words = normalized.match(WORD_TOKEN_RE)
  if (!words || words.length === 0) {
    return hasTerminalPunctuation(normalized) ? normalized : `${normalized}.`
  }

  const clauses: string[] = []
  let clauseKind: ClauseKind = detectClauseKind(words, 0) ?? 'statement'
  let clauseWords: string[] = []

  const flush = () => {
    if (clauseWords.length === 0) return
    const capitalized = [capitalizeWord(clauseWords[0]), ...clauseWords.slice(1)]
    clauses.push(`${capitalized.join(' ')}${terminalForKind(clauseKind)}`)
    clauseWords = []
  }

  for (let i = 0; i < words.length; i += 1) {
    const kind = detectClauseKind(words, i)
    if (i > 0 && kind) {
      flush()
      clauseKind = kind
    } else if (i === 0) {
      clauseKind = kind ?? 'statement'
    }
    clauseWords.push(words[i])
  }
  flush()

  const result = clauses.join(' ')
  if (!hasTerminalPunctuation(result)) return `${result}.`
  return result
}
