import type { EngvoCefrLevel } from '@/lib/engvo/constants'

export type FreeCallTurnTooLongReason = 'too_long' | 'lecture' | 'helpdesk'

export type FreeCallTurnCompletenessResult = {
  tooLong: boolean
  reason: FreeCallTurnTooLongReason | null
}

const HELPDESK_RE =
  /\b(?:what\s+can\s+i\s+help(?:\s+you\s+with)?|how\s+can\s+i\s+(?:help|assist)|i'?m\s+all\s+ears)\b/i

const TOPIC_MENU_RE =
  /\bwhere\s+would\s+you\s+like\s+to\s+start\b|\bwould\s+you\s+like\s+to\s+(?:start|begin|talk)\b/i

function countSentences(text: string): number {
  const parts = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length
}

function countWords(text: string): number {
  return (text.match(/[A-Za-zÀ-ÿ]+(?:'[A-Za-zÀ-ÿ]+)?/g) ?? []).length
}

function hasLectureMenu(text: string): boolean {
  if (!TOPIC_MENU_RE.test(text)) return false
  const commas = (text.match(/,/g) ?? []).length
  return commas >= 2
}

function limitsForLevel(level: EngvoCefrLevel): { maxSentences: number; maxWords: number } {
  if (level === 'a1') return { maxSentences: 2, maxWords: 35 }
  if (level === 'a2') return { maxSentences: 3, maxWords: 50 }
  return { maxSentences: 3, maxWords: 60 }
}

/**
 * Detect free-call assistant turns that are too long / lecture / helpdesk.
 * Pass raw transcript (before CEFR guard).
 */
export function isTooLongFreeCallAssistantTurn(params: {
  text: string
  level: EngvoCefrLevel
  /** Skip opening before the learner has spoken. */
  userFinalCount: number
}): FreeCallTurnCompletenessResult {
  const text = params.text.trim()
  if (!text) {
    return { tooLong: false, reason: null }
  }
  if (params.userFinalCount < 1) {
    return { tooLong: false, reason: null }
  }

  if (HELPDESK_RE.test(text)) {
    return { tooLong: true, reason: 'helpdesk' }
  }
  if (hasLectureMenu(text)) {
    return { tooLong: true, reason: 'lecture' }
  }

  const { maxSentences, maxWords } = limitsForLevel(params.level)
  const sentences = countSentences(text)
  const words = countWords(text)
  if (sentences > maxSentences || words > maxWords) {
    return { tooLong: true, reason: 'too_long' }
  }

  return { tooLong: false, reason: null }
}
