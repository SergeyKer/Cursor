import * as React from 'react'

export type VoicePhase = 'idle' | 'recording' | 'finalizing' | 'error'

export type VoiceComposerState = {
  draftText: string
  draftBeforeVoiceText: string
  voiceFinalText: string
  voiceInterimText: string
  lastCommittedVoiceText: string
  voicePhase: VoicePhase
  statusMessage: string | null
}

type VoiceComposerAction =
  | { type: 'setDraftText'; text: string }
  | { type: 'startRecording' }
  | { type: 'updateTranscript'; finalText: string; interimText: string }
  | { type: 'beginFinalizing'; statusMessage?: string | null }
  | { type: 'commitVoiceText'; text: string }
  | { type: 'failVoiceSession'; statusMessage: string }
  | { type: 'finishVoiceSession'; statusMessage?: string | null }
  | { type: 'setStatusMessage'; statusMessage: string | null }
  | { type: 'reset' }

export const initialVoiceComposerState: VoiceComposerState = {
  draftText: '',
  draftBeforeVoiceText: '',
  voiceFinalText: '',
  voiceInterimText: '',
  lastCommittedVoiceText: '',
  voicePhase: 'idle',
  statusMessage: null,
}

function needsBoundaryWhitespace(base: string, addition: string): boolean {
  if (!base || !addition) return false
  if (/\s$/.test(base) || /^\s/.test(addition)) return false
  if (/[([{"'`-]$/.test(base)) return false
  if (/^[,.;:!?)\]}"'`]/.test(addition)) return false
  return true
}

export function appendVoiceText(base: string, addition: string): string {
  const normalizedBase = base
  const normalizedAddition = addition.trim()
  if (!normalizedAddition) return normalizedBase
  if (!normalizedBase) return normalizedAddition
  return `${normalizedBase}${needsBoundaryWhitespace(normalizedBase, normalizedAddition) ? ' ' : ''}${normalizedAddition}`
}

function normalizeTranscriptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isStablePrefixExpansion(base: string, candidate: string): boolean {
  if (!base || !candidate) return false
  if (candidate === base) return true
  if (!candidate.startsWith(base)) return false
  const nextChar = candidate[base.length]
  return nextChar == null || /\s|[,.!?;:)\]}]/.test(nextChar)
}

/** Longest k where a ends with b's first k chars; conservative to avoid mid-word false joins. */
function longestSafeSuffixPrefixOverlap(a: string, b: string): number {
  const maxK = Math.min(a.length, b.length)
  for (let k = maxK; k >= 2; k -= 1) {
    if (a.slice(-k) !== b.slice(0, k)) continue
    if (k < a.length) {
      const charBeforeOverlap = a[a.length - k - 1]
      if (charBeforeOverlap && !/\s/.test(charBeforeOverlap)) continue
    }
    if (k < b.length && k < 4) {
      const atSeamInB = b[k]
      if (atSeamInB && /\w/.test(a[a.length - 1]) && /\w/.test(atSeamInB)) continue
    }
    return k
  }
  return 0
}

/**
 * Merges two normalized transcript chunks for display or final accumulation.
 * Callers pass strings already passed through normalizeTranscriptText.
 */
function mergeAdjacentTranscriptSegments(normalizedBase: string, normalizedNext: string): string {
  if (!normalizedNext) return normalizedBase
  if (!normalizedBase) return normalizedNext
  if (isStablePrefixExpansion(normalizedBase, normalizedNext)) {
    return normalizedNext
  }
  if (normalizedBase.startsWith(normalizedNext)) {
    return normalizedBase
  }
  if (normalizedNext.startsWith(normalizedBase)) {
    return normalizedNext
  }
  const overlap = longestSafeSuffixPrefixOverlap(normalizedBase, normalizedNext)
  if (overlap > 0) {
    return `${normalizedBase}${normalizedNext.slice(overlap)}`
  }
  return appendVoiceText(normalizedBase, normalizedNext)
}

function mergeOnlyOverlappingTranscriptSegments(normalizedBase: string, normalizedNext: string): string {
  if (!normalizedNext) return normalizedBase
  if (!normalizedBase) return normalizedNext
  if (isStablePrefixExpansion(normalizedBase, normalizedNext)) {
    return normalizedNext
  }
  if (normalizedBase.startsWith(normalizedNext)) {
    return normalizedBase
  }
  if (normalizedNext.startsWith(normalizedBase)) {
    return normalizedNext
  }
  const overlap = longestSafeSuffixPrefixOverlap(normalizedBase, normalizedNext)
  if (overlap > 0) {
    return `${normalizedBase}${normalizedNext.slice(overlap)}`
  }
  return normalizedBase
}

export function mergeSpeechFinalSegment(base: string, next: string): string {
  const normalizedBase = normalizeTranscriptText(base)
  const normalizedNext = normalizeTranscriptText(next)
  return mergeAdjacentTranscriptSegments(normalizedBase, normalizedNext)
}

export function chooseFinalSpeechText(finalText: string, interimText: string): string {
  const normalizedFinal = normalizeTranscriptText(finalText)
  const normalizedInterim = normalizeTranscriptText(interimText)
  if (!normalizedInterim) return normalizedFinal
  if (!normalizedFinal) return normalizedInterim
  return mergeOnlyOverlappingTranscriptSegments(normalizedFinal, normalizedInterim)
}

export function mergeSpeechDisplayText(finalText: string, interimText: string): string {
  const normalizedFinal = normalizeTranscriptText(finalText)
  const normalizedInterim = normalizeTranscriptText(interimText)
  return mergeAdjacentTranscriptSegments(normalizedFinal, normalizedInterim)
}

export function buildVoiceDisplayText(params: {
  draftBeforeVoiceText: string
  voiceFinalText: string
  voiceInterimText: string
}): string {
  const speechText = mergeSpeechDisplayText(params.voiceFinalText, params.voiceInterimText)
  return appendVoiceText(params.draftBeforeVoiceText, speechText)
}

export function buildVoiceLivePreviewText(params: {
  voiceFinalText: string
  voiceInterimText: string
}): string {
  return mergeSpeechDisplayText(params.voiceFinalText, params.voiceInterimText)
}

function getSpeechRecognitionResultText(result: SpeechRecognitionResult | undefined): string {
  return result?.[0]?.transcript?.trim() ?? ''
}

function choosePreferredInterimText(current: string, next: string): string {
  const normalizedCurrent = normalizeTranscriptText(current)
  const normalizedNext = normalizeTranscriptText(next)
  if (!normalizedNext) return normalizedCurrent
  if (!normalizedCurrent) return normalizedNext
  if (isStablePrefixExpansion(normalizedCurrent, normalizedNext)) return normalizedNext
  if (isStablePrefixExpansion(normalizedNext, normalizedCurrent)) return normalizedCurrent
  return normalizedNext.length >= normalizedCurrent.length ? normalizedNext : normalizedCurrent
}

export function stabilizeInterimAcrossTicks(previous: string, next: string): string {
  const normalizedPrevious = normalizeTranscriptText(previous)
  const normalizedNext = normalizeTranscriptText(next)
  if (!normalizedNext) return ''
  if (!normalizedPrevious) return normalizedNext
  if (isStablePrefixExpansion(normalizedPrevious, normalizedNext)) return normalizedNext
  if (isStablePrefixExpansion(normalizedNext, normalizedPrevious)) return normalizedPrevious
  if (normalizedPrevious.length > normalizedNext.length) {
    return normalizedPrevious
  }
  return normalizedNext
}

export function extractSpeechRecognitionTranscript(event: SpeechRecognitionEvent): {
  finalText: string
  interimText: string
} {
  let finalText = ''
  let interimText = ''
  const startIndex = Math.min(Math.max(event.resultIndex ?? 0, 0), event.results.length)

  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i]
    const text = getSpeechRecognitionResultText(result)
    if (!text) continue
    if (result.isFinal) {
      finalText = mergeSpeechFinalSegment(finalText, text)
      continue
    }
    if (i >= startIndex) {
      interimText = choosePreferredInterimText(interimText, text)
    }
  }

  if (!interimText) {
    for (let i = event.results.length - 1; i >= 0; i--) {
      const result = event.results[i]
      if (result?.isFinal) continue
      interimText = choosePreferredInterimText(interimText, getSpeechRecognitionResultText(result))
      if (interimText) break
    }
  }

  return { finalText, interimText }
}

export function voiceComposerReducer(
  state: VoiceComposerState,
  action: VoiceComposerAction
): VoiceComposerState {
  switch (action.type) {
    case 'setDraftText':
      return {
        ...state,
        draftText: action.text,
        lastCommittedVoiceText: '',
        statusMessage: state.voicePhase === 'error' ? null : state.statusMessage,
      }
    case 'startRecording':
      return {
        ...state,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
        lastCommittedVoiceText: '',
        draftText: '',
        voicePhase: 'recording',
        statusMessage: null,
      }
    case 'updateTranscript':
      return {
        ...state,
        voiceFinalText: action.finalText,
        voiceInterimText: action.interimText,
        voicePhase: state.voicePhase === 'finalizing' ? 'finalizing' : 'recording',
      }
    case 'beginFinalizing':
      return {
        ...state,
        voicePhase: 'finalizing',
        statusMessage: action.statusMessage ?? state.statusMessage,
      }
    case 'commitVoiceText':
      return {
        ...state,
        draftText: action.text,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
        lastCommittedVoiceText: action.text.trim(),
        voicePhase: 'idle',
        statusMessage: null,
      }
    case 'failVoiceSession':
      return {
        ...state,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
        lastCommittedVoiceText: '',
        voicePhase: 'error',
        statusMessage: action.statusMessage,
      }
    case 'finishVoiceSession':
      return {
        ...state,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
        lastCommittedVoiceText: '',
        voicePhase: 'idle',
        statusMessage: action.statusMessage ?? null,
      }
    case 'setStatusMessage':
      return {
        ...state,
        statusMessage: action.statusMessage,
      }
    case 'reset':
      return { ...initialVoiceComposerState }
    default:
      return state
  }
}

export function useVoiceComposer(initialDraftText = '') {
  const [state, dispatch] = React.useReducer(voiceComposerReducer, {
    ...initialVoiceComposerState,
    draftText: initialDraftText,
  })
  const setDraftText = React.useCallback((text: string) => {
    dispatch({ type: 'setDraftText', text })
  }, [])
  const startRecording = React.useCallback(() => {
    dispatch({ type: 'startRecording' })
  }, [])
  const updateTranscript = React.useCallback((finalText: string, interimText: string) => {
    dispatch({ type: 'updateTranscript', finalText, interimText })
  }, [])
  const beginFinalizing = React.useCallback((statusMessage?: string | null) => {
    dispatch({ type: 'beginFinalizing', statusMessage })
  }, [])
  const commitVoiceText = React.useCallback((text: string) => {
    dispatch({ type: 'commitVoiceText', text })
  }, [])
  const failVoiceSession = React.useCallback((statusMessage: string) => {
    dispatch({ type: 'failVoiceSession', statusMessage })
  }, [])
  const finishVoiceSession = React.useCallback((statusMessage?: string | null) => {
    dispatch({ type: 'finishVoiceSession', statusMessage })
  }, [])
  const setStatusMessage = React.useCallback((statusMessage: string | null) => {
    dispatch({ type: 'setStatusMessage', statusMessage })
  }, [])
  const resetComposer = React.useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const displayText = React.useMemo(
    () =>
      buildVoiceDisplayText({
        draftBeforeVoiceText: state.draftBeforeVoiceText,
        voiceFinalText: state.voiceFinalText,
        voiceInterimText: state.voiceInterimText,
      }),
    [state.draftBeforeVoiceText, state.voiceFinalText, state.voiceInterimText]
  )
  const livePreviewText = React.useMemo(
    () =>
      buildVoiceLivePreviewText({
        voiceFinalText: state.voiceFinalText,
        voiceInterimText: state.voiceInterimText,
      }),
    [state.voiceFinalText, state.voiceInterimText]
  )

  const isVoiceActive = state.voicePhase === 'recording' || state.voicePhase === 'finalizing'

  return {
    ...state,
    displayText,
    livePreviewText,
    isVoiceActive,
    isTextareaReadOnly: isVoiceActive,
    setDraftText,
    startRecording,
    updateTranscript,
    beginFinalizing,
    commitVoiceText,
    failVoiceSession,
    finishVoiceSession,
    setStatusMessage,
    resetComposer,
  }
}
