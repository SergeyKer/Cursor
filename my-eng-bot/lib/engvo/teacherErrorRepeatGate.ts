import { splitEngvoAssistantRepeatCue } from '@/lib/engvo/assistantRepeatCue'
import { hasErrorRepeatMarkers } from '@/lib/engvo/teacherDrillCompleteness'
import { looksLikeTeacherEnglishAttempt } from '@/lib/engvo/teacherDrillProgress'
import { normalizeEngvoUserTranscriptForCompare } from '@/lib/engvo/userTranscriptCoalesce'
import { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'

export type TeacherErrorRepeatGateState = {
  pendingTarget: string | null
  awaitingUserTry: boolean
  repeatConsumed: boolean
}

export type TeacherErrorRepeatGateResult = {
  state: TeacherErrorRepeatGateState
  displayText: string
  /** Second same-target marker after honest try — strip + reclaim next RU. */
  shouldAntiLoopReclaim: boolean
  /** True when this turn was blocked (stripped). */
  blocked: boolean
  /** True when this turn armed a new pending target. */
  armed: boolean
}

export function createTeacherErrorRepeatGateState(): TeacherErrorRepeatGateState {
  return {
    pendingTarget: null,
    awaitingUserTry: false,
    repeatConsumed: false,
  }
}

export function resetTeacherErrorRepeatGate(): TeacherErrorRepeatGateState {
  return createTeacherErrorRepeatGateState()
}

/** Reset when a new complete RU drill is committed (SUCCESS path). */
export function noteErrorRepeatCompleteDrill(
  state: TeacherErrorRepeatGateState
): TeacherErrorRepeatGateState {
  return resetTeacherErrorRepeatGate()
}

/**
 * Honest English try while awaiting repeat → consume (meta/refuse do not consume).
 */
export function noteErrorRepeatUserTry(
  state: TeacherErrorRepeatGateState,
  userText: string
): TeacherErrorRepeatGateState {
  if (!state.pendingTarget || !state.awaitingUserTry) return state
  if (!looksLikeTeacherEnglishAttempt(userText)) return state
  state.awaitingUserTry = false
  state.repeatConsumed = true
  return state
}

function extractRepeatTarget(rawText: string): string | null {
  const extracted = extractTeacherCorrection(rawText)
  if (extracted.corrected?.trim()) {
    return normalizeEngvoUserTranscriptForCompare(extracted.corrected)
  }
  const cue = splitEngvoAssistantRepeatCue(rawText)
  if (cue?.repeatText.trim()) {
    return normalizeEngvoUserTranscriptForCompare(cue.repeatText)
  }
  return null
}

/**
 * Strip Say:/Скажи:/You meant + EN canon; keep soft lead-in when present.
 */
export function stripTeacherErrorRepeatMarkers(text: string): string {
  const cue = splitEngvoAssistantRepeatCue(text)
  if (cue) {
    return cue.correction.replace(/\s+$/u, '').trim()
  }

  const lines = text.split(/\r?\n/)
  const kept: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^(?:you\s+mean(?:t)?|say|скажи)\s*:/i.test(trimmed)) continue
    if (/\byou\s+mean(?:t)?\s*:/i.test(trimmed) && /say\s*:/i.test(trimmed)) {
      const before = trimmed.replace(/\byou\s+mean(?:t)?\s*:[\s\S]*$/i, '').trim()
      if (before) kept.push(before)
      continue
    }
    kept.push(line)
  }
  return kept.join('\n').trim()
}

/**
 * Apply ERROR repeat policy to an assistant turn (teacher drill only — caller gates).
 */
export function applyTeacherErrorRepeatGate(
  state: TeacherErrorRepeatGateState,
  rawText: string
): TeacherErrorRepeatGateResult {
  const raw = rawText.trim()
  if (!raw || !hasErrorRepeatMarkers(raw)) {
    return {
      state,
      displayText: rawText,
      shouldAntiLoopReclaim: false,
      blocked: false,
      armed: false,
    }
  }

  const target = extractRepeatTarget(raw)
  if (!target) {
    return {
      state,
      displayText: rawText,
      shouldAntiLoopReclaim: false,
      blocked: false,
      armed: false,
    }
  }

  if (
    state.repeatConsumed &&
    state.pendingTarget &&
    state.pendingTarget === target
  ) {
    const stripped = stripTeacherErrorRepeatMarkers(raw)
    return {
      state,
      displayText: stripped,
      shouldAntiLoopReclaim: true,
      blocked: true,
      armed: false,
    }
  }

  if (state.repeatConsumed && state.pendingTarget && state.pendingTarget !== target) {
    state.pendingTarget = target
    state.awaitingUserTry = true
    state.repeatConsumed = false
    return {
      state,
      displayText: rawText,
      shouldAntiLoopReclaim: false,
      blocked: false,
      armed: true,
    }
  }

  if (!state.pendingTarget) {
    state.pendingTarget = target
    state.awaitingUserTry = true
    state.repeatConsumed = false
    return {
      state,
      displayText: rawText,
      shouldAntiLoopReclaim: false,
      blocked: false,
      armed: true,
    }
  }

  // Already pending same (or any) target, user has not tried yet — pass through.
  return {
    state,
    displayText: rawText,
    shouldAntiLoopReclaim: false,
    blocked: false,
    armed: false,
  }
}
