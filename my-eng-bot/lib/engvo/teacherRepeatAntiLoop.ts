import { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'
import { normalizeEngvoUserTranscriptForCompare } from '@/lib/engvo/userTranscriptCoalesce'
import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'

export type TeacherRepeatAntiLoopState = {
  pendingTarget: string | null
  awaitingUserTry: boolean
  repeatConsumed: boolean
}

export function createTeacherRepeatAntiLoopState(): TeacherRepeatAntiLoopState {
  return {
    pendingTarget: null,
    awaitingUserTry: false,
    repeatConsumed: false,
  }
}

export function resetTeacherRepeatAntiLoop(): TeacherRepeatAntiLoopState {
  return createTeacherRepeatAntiLoopState()
}

const YOU_MEANT_CHUNK_RE =
  /you\s*mean(?:t)?\s*:\s*["“]?[^"”\n]+["”]?/gi
const SKAZHI_CHUNK_RE = /скажи\s*:\s*[^.!?\n]+[.!?]?/gi
const SAY_CHUNK_RE = /(?:^|[.!?]\s*)say\s*:\s*[^.!?\n]+[.!?]?/gi

/** Remove Скажи / Say / You meant chunks; keep soft lead-in if any. */
export function stripTeacherRepeatMarkers(text: string): string {
  let out = text
    .replace(YOU_MEANT_CHUNK_RE, ' ')
    .replace(SKAZHI_CHUNK_RE, ' ')
    .replace(SAY_CHUNK_RE, ' ')
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim()
  return out
}

export function hasTeacherRepeatMarker(text: string): boolean {
  return Boolean(extractTeacherCorrection(text).corrected)
}

/**
 * Teacher-call UI: find repeat target even when marker is mid-line.
 * Does not change communication/translation extractRepeatPrompt behavior.
 */
export function extractTeacherCallRepeatPrompt(text: string): {
  repeatText: string
  leadIn: string
} | null {
  const extracted = extractTeacherCorrection(text)
  if (!extracted.corrected?.trim()) return null
  const repeatText = extracted.corrected.trim()
  const leadIn = stripTeacherRepeatMarkers(text)
  return { repeatText, leadIn }
}

function normalizeTarget(text: string): string {
  return normalizeEngvoUserTranscriptForCompare(text)
}

export function noteUserFinal(state: TeacherRepeatAntiLoopState): TeacherRepeatAntiLoopState {
  if (!state.awaitingUserTry || !state.pendingTarget) return state
  return {
    ...state,
    awaitingUserTry: false,
    repeatConsumed: true,
  }
}

export function noteCompleteDrillFromAssistantText(
  state: TeacherRepeatAntiLoopState,
  text: string,
  phase: 'topic_choice' | 'drill' | null
): TeacherRepeatAntiLoopState {
  if (hasTeacherRepeatMarker(text)) return state
  const result = isIncompleteTeacherAssistantTurn({
    text,
    phase: phase === 'topic_choice' || phase === 'drill' ? phase : 'drill',
    awaitingFirstDrill: false,
  })
  if (result.isCompleteDrill) return resetTeacherRepeatAntiLoop()
  return state
}

export type ApplyAssistantAntiLoopResult = {
  state: TeacherRepeatAntiLoopState
  displayText: string
  shouldAntiLoopReclaim: boolean
  /** True when a second repeat-ask was blocked. */
  blocked: boolean
  /** True when this turn newly armed a pending repeat. */
  armed: boolean
}

/**
 * Apply one-Скажи-per-mistake policy to an assistant commit (teacher drill only).
 */
export function applyAssistantAntiLoopPolicy(
  state: TeacherRepeatAntiLoopState,
  text: string
): ApplyAssistantAntiLoopResult {
  const extracted = extractTeacherCorrection(text)
  const corrected = extracted.corrected?.trim() ?? null

  if (state.repeatConsumed && state.pendingTarget && corrected) {
    return {
      state,
      displayText: stripTeacherRepeatMarkers(text),
      shouldAntiLoopReclaim: true,
      blocked: true,
      armed: false,
    }
  }

  if (corrected && !state.pendingTarget) {
    return {
      state: {
        pendingTarget: normalizeTarget(corrected),
        awaitingUserTry: true,
        repeatConsumed: false,
      },
      displayText: text,
      shouldAntiLoopReclaim: false,
      blocked: false,
      armed: true,
    }
  }

  return {
    state,
    displayText: text,
    shouldAntiLoopReclaim: false,
    blocked: false,
    armed: false,
  }
}
