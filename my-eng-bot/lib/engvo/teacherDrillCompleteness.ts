import type { EngvoTeacherPhase } from '@/lib/engvo/sessionKind'

export type TeacherDrillIncompleteReason = 'no_first_drill' | 'invite_without_ru'

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
  /(?:\byou\s+meant\b|\byou\s+mean\b|(?:^|[^\p{L}\p{N}])скажи\s*:)/iu

const INVITE_ONLY_LINE_RE =
  /^(?:translate(?:\s+into\s+english)?|your\s+turn(?:\s*[—–-]?\s*in\s+english)?|go\s+ahead(?:\s*[—–-]?\s*(?:in\s+)?english)?|переведи(?:те)?(?:\s+на\s+английский(?:\s+язык)?)?|твоя\s+очередь(?:\s*[—–-]?\s*на\s+английском)?)\.?$/iu

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

  return { incomplete: false, reason: null, isCompleteDrill }
}
