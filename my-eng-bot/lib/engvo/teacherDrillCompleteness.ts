import type { EngvoTeacherPhase } from '@/lib/engvo/sessionKind'

export type TeacherDrillIncompleteReason =
  | 'no_first_drill'
  | 'invite_without_ru'
  | 'missing_drill'

export type TeacherDrillCompletenessResult = {
  incomplete: boolean
  reason: TeacherDrillIncompleteReason | null
  /** True when this turn itself is a complete drill (payload + invite). */
  isCompleteDrill: boolean
}

/** `\b` is ASCII-only; use explicit edges for Cyrillic invites. */
const TRANSLATE_INVITE_RE =
  /(?:\btranslate\b|\byour\s+turn\b|\bgo\s+ahead\b[\s\S]{0,40}?\benglish\b|(?:^|[^\p{L}\p{N}])переведи(?:те)?(?=$|[^\p{L}\p{N}])|(?:^|[^\p{L}\p{N}])твоя\s+очередь(?=$|[^\p{L}\p{N}])|(?:^|[^\p{L}\p{N}])на\s+английск(?:ий|ом)(?=$|[^\p{L}\p{N}]))/iu

const ERROR_REPEAT_MARKER_RE =
  /(?:\byou\s+meant\b|\byou\s+mean\b|\bsay\s*:|(?:^|[^\p{L}\p{N}])скажи\s*:)/iu

const INVITE_ONLY_LINE_RE =
  /^(?:translate(?:\s+into\s+english)?|your\s+turn(?:\s*[—–-]?\s*in\s+english)?|go\s+ahead(?:\s*[—–-]?\s*(?:in\s+)?english)?|переведи(?:те)?(?:\s+на\s+английский(?:\s+язык)?)?|твоя\s+очередь(?:\s*[—–-]?\s*на\s+английском)?)\.?$/iu

/**
 * Content-interview turns after the first drill (not praise-only, not ERROR).
 * Narrow on purpose — do not treat every EN turn without RU as incomplete.
 */
const INTERVIEW_EN_RE =
  /\b(?:where|what|how|why|when|tell\s+me|do\s+you|did\s+you|have\s+you|are\s+you)\b/iu

const INTERVIEW_RU_RE =
  /(?:расскаж|поведай|а\s+что\s+ты|куда\s+ты|что\s+ты\s+обычно)/iu

/** Strip translate-invite lines/phrases so remaining Cyrillic is drill payload. */
export function stripTranslateInvite(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (INVITE_ONLY_LINE_RE.test(trimmed)) return ''
      return trimmed
        .replace(/\btranslate(?:\s+into\s+english)?\b[.!?]?/giu, ' ')
        .replace(/\byour\s+turn(?:\s*[—–-]?\s*in\s+english)?\b[.!?]?/giu, ' ')
        .replace(/\bgo\s+ahead(?:\s*[—–-]?\s*(?:in\s+)?english)?\b[.!?]?/giu, ' ')
        .replace(/переведи(?:те)?(?:\s+на\s+английский(?:\s+язык)?)?[.!?]?/giu, ' ')
        .replace(/твоя\s+очередь(?:\s*[—–-]?\s*на\s+английском)?[.!?]?/giu, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    })
    .filter(Boolean)
    .join('\n')
    .trim()
}

export function hasTranslateInvite(text: string): boolean {
  return TRANSLATE_INVITE_RE.test(text)
}

export function hasRussianDrillPayload(text: string): boolean {
  const stripped = stripTranslateInvite(text)
  return /[А-Яа-яЁё]{3,}/u.test(stripped)
}

export function hasErrorRepeatMarkers(text: string): boolean {
  return ERROR_REPEAT_MARKER_RE.test(text)
}

/** True when the turn looks like a topic/experience interview, not a drill. */
export function looksLikeInterview(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (INTERVIEW_RU_RE.test(t)) return true
  if (!INTERVIEW_EN_RE.test(t)) return false
  // Require question shape or interview-verb lead so praise with "how" does not fire.
  if (/[?]/.test(t)) return true
  if (/\b(?:tell\s+me|do\s+you|did\s+you|have\s+you|are\s+you)\b/iu.test(t)) return true
  // Where/What/How/Why/When as sentence start (common interview without "?")
  return /(?:^|[.!?]\s*)(?:where|what|how|why|when)\b/iu.test(t)
}

/**
 * Detect incomplete teacher assistant turns that need a client reclaim.
 * Pass raw transcript (before CEFR guard).
 */
export function isIncompleteTeacherAssistantTurn(params: {
  text: string
  phase: EngvoTeacherPhase | null
  awaitingFirstDrill: boolean
}): TeacherDrillCompletenessResult {
  const text = params.text.trim()
  if (!text) {
    return { incomplete: false, reason: null, isCompleteDrill: false }
  }

  if (params.phase !== 'drill') {
    // Premature drill during topic_choice: Translate/Переведи without Russian payload.
    // Do not reclaim normal greetings (no translate invite).
    if (params.phase === 'topic_choice') {
      const invite = hasTranslateInvite(text)
      const payload = hasRussianDrillPayload(text)
      if (invite && !payload) {
        return { incomplete: true, reason: 'invite_without_ru', isCompleteDrill: false }
      }
      if (invite && payload) {
        return { incomplete: false, reason: null, isCompleteDrill: true }
      }
    }
    return { incomplete: false, reason: null, isCompleteDrill: false }
  }

  if (hasErrorRepeatMarkers(text)) {
    return { incomplete: false, reason: null, isCompleteDrill: false }
  }

  const invite = hasTranslateInvite(text)
  const payload = hasRussianDrillPayload(text)
  const isCompleteDrill = invite && payload

  if (params.awaitingFirstDrill) {
    if (isCompleteDrill) {
      return { incomplete: false, reason: null, isCompleteDrill: true }
    }
    return { incomplete: true, reason: 'no_first_drill', isCompleteDrill: false }
  }

  if (invite && !payload) {
    return { incomplete: true, reason: 'invite_without_ru', isCompleteDrill: false }
  }

  if (!isCompleteDrill && looksLikeInterview(text)) {
    return { incomplete: true, reason: 'missing_drill', isCompleteDrill: false }
  }

  return { incomplete: false, reason: null, isCompleteDrill }
}
