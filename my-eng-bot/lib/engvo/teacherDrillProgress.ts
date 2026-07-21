import {
  hasErrorRepeatMarkers,
  hasRussianDrillPayload,
  hasTranslateInvite,
  stripTranslateInvite,
} from '@/lib/engvo/teacherDrillCompleteness'

export type TeacherDrillProgressState = {
  lastDrillRuNormalized: string | null
  /** True when a drill RU is posed and we still await an English attempt. */
  drillAwaitingAnswer: boolean
  /** Last user final was an exact/near echo of the current drill RU. */
  lastWasRussianEcho: boolean
}

export type TeacherDrillCommitAction =
  | 'commit'
  | 'reclaim_duplicate'
  | 'reclaim_russian_echo'
  | 'ignore'

export type TeacherDrillCommitResult = {
  action: TeacherDrillCommitAction
  state: TeacherDrillProgressState
  /** Normalized previous RU when reclaim needs it. */
  previousRussian: string | null
  /** Raw extracted drill RU for the committed turn (unnormalized display form). */
  drillRu: string | null
}

const CYRILLIC_WORD_RE = /[А-Яа-яЁё]{3,}/u
const LATIN_TOKEN_RE = /[A-Za-z]{2,}/g
const REFUSE_META_RE =
  /^(?:i\s*don'?t\s*know|i\s*do\s*not\s*know|what\??|sorry|repeat|help|idk|hmm+|huh\??)\.?$/iu
const RU_META_RE =
  /^(?:не\s*знаю|повтори|что\??|помощь|ладно|хорошо|ок|окей|да|нет)\.?$/iu

export function createTeacherDrillProgressState(): TeacherDrillProgressState {
  return {
    lastDrillRuNormalized: null,
    drillAwaitingAnswer: false,
    lastWasRussianEcho: false,
  }
}

export function resetTeacherDrillProgress(
  state: TeacherDrillProgressState = createTeacherDrillProgressState()
): TeacherDrillProgressState {
  state.lastDrillRuNormalized = null
  state.drillAwaitingAnswer = false
  state.lastWasRussianEcho = false
  return state
}

/** Normalize RU drill for equality compare. */
export function normalizeTeacherDrillRu(text: string): string {
  return text
    .replace(/ё/giu, 'е')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract the drill Russian sentence: last Cyrillic sentence after stripping invites.
 * Praise prefixes (A2) are ignored by taking the last matching sentence.
 */
export function extractTeacherDrillRu(text: string): string | null {
  const stripped = stripTranslateInvite(text)
  if (!stripped) return null

  const parts = stripped
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const candidates = parts.length > 0 ? parts : [stripped]
  for (let i = candidates.length - 1; i >= 0; i--) {
    const part = candidates[i]
    if (CYRILLIC_WORD_RE.test(part)) {
      return part.replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

/** True when the learner utterance looks like an English drill attempt (not meta/derail). */
export function looksLikeTeacherEnglishAttempt(userText: string): boolean {
  const t = userText.trim()
  if (!t) return false
  if (REFUSE_META_RE.test(t)) return false

  const letterCount = (t.match(/[A-Za-z]/g) ?? []).length
  if (letterCount === 0) return false

  const latinTokens = t.match(LATIN_TOKEN_RE) ?? []
  if (latinTokens.length >= 2) return true
  if (letterCount >= 12) return true

  // Short A1 answers like "I go" / "I am": ≥2 whitespace tokens with Latin + enough letters.
  const wordsWithLatin = t.split(/\s+/).filter((w) => /[A-Za-z]/.test(w))
  return wordsWithLatin.length >= 2 && letterCount >= 3
}

/** Exact/near echo of the current Russian drill (not meta, not English). */
export function isTeacherRussianDrillEcho(
  userText: string,
  lastDrillRuNormalized: string | null
): boolean {
  if (!lastDrillRuNormalized) return false
  const t = userText.trim()
  if (!t) return false
  if (looksLikeTeacherEnglishAttempt(t)) return false
  if (REFUSE_META_RE.test(t) || RU_META_RE.test(t)) return false
  return normalizeTeacherDrillRu(t) === lastDrillRuNormalized
}

export function noteTeacherDrillUserAttempt(
  state: TeacherDrillProgressState,
  userText: string
): TeacherDrillProgressState {
  if (!state.lastDrillRuNormalized) return state

  if (looksLikeTeacherEnglishAttempt(userText)) {
    state.drillAwaitingAnswer = false
    state.lastWasRussianEcho = false
    return state
  }

  state.lastWasRussianEcho = isTeacherRussianDrillEcho(
    userText,
    state.lastDrillRuNormalized
  )
  return state
}

function isCompleteDrillTurn(rawText: string): boolean {
  return hasTranslateInvite(rawText) && hasRussianDrillPayload(rawText)
}

/**
 * After an assistant turn: commit a new drill RU, reclaim duplicate/echo, or ignore.
 */
export function commitTeacherDrillFromAssistant(
  state: TeacherDrillProgressState,
  rawText: string
): TeacherDrillCommitResult {
  const text = rawText.trim()
  if (!text) {
    return { action: 'ignore', state, previousRussian: null, drillRu: null }
  }

  if (hasErrorRepeatMarkers(text)) {
    state.lastWasRussianEcho = false
    return { action: 'ignore', state, previousRussian: null, drillRu: null }
  }

  if (!isCompleteDrillTurn(text)) {
    return { action: 'ignore', state, previousRussian: null, drillRu: null }
  }

  const drillRu = extractTeacherDrillRu(text)
  if (!drillRu) {
    return { action: 'ignore', state, previousRussian: null, drillRu: null }
  }

  const normalized = normalizeTeacherDrillRu(drillRu)
  if (!normalized) {
    return { action: 'ignore', state, previousRussian: null, drillRu: null }
  }

  if (state.lastWasRussianEcho) {
    return {
      action: 'reclaim_russian_echo',
      state,
      previousRussian: state.lastDrillRuNormalized,
      drillRu,
    }
  }

  const isDuplicateAfterAttempt =
    Boolean(state.lastDrillRuNormalized) &&
    !state.drillAwaitingAnswer &&
    normalized === state.lastDrillRuNormalized

  if (isDuplicateAfterAttempt) {
    return {
      action: 'reclaim_duplicate',
      state,
      previousRussian: state.lastDrillRuNormalized,
      drillRu,
    }
  }

  state.lastDrillRuNormalized = normalized
  state.drillAwaitingAnswer = true
  state.lastWasRussianEcho = false
  return { action: 'commit', state, previousRussian: null, drillRu }
}
