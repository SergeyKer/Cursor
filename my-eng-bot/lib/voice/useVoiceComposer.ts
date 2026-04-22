import * as React from 'react'

export type VoicePhase = 'idle' | 'recording' | 'finalizing' | 'error'

export type VoiceComposerState = {
  draftText: string
  draftBeforeVoiceText: string
  voiceFinalText: string
  voiceInterimText: string
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

export function buildVoiceDisplayText(params: {
  draftBeforeVoiceText: string
  voiceFinalText: string
  voiceInterimText: string
}): string {
  const withFinal = appendVoiceText(params.draftBeforeVoiceText, params.voiceFinalText)
  return appendVoiceText(withFinal, params.voiceInterimText)
}

function getSpeechRecognitionResultText(result: SpeechRecognitionResult | undefined): string {
  return result?.[0]?.transcript?.trim() ?? ''
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
      finalText = appendVoiceText(finalText, text)
      continue
    }
    if (i >= startIndex) {
      interimText = text
    }
  }

  if (!interimText) {
    for (let i = event.results.length - 1; i >= 0; i--) {
      const result = event.results[i]
      if (result?.isFinal) continue
      interimText = getSpeechRecognitionResultText(result)
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
        statusMessage: state.voicePhase === 'error' ? null : state.statusMessage,
      }
    case 'startRecording':
      return {
        ...state,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
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
        voicePhase: 'idle',
        statusMessage: null,
      }
    case 'failVoiceSession':
      return {
        ...state,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
        voicePhase: 'error',
        statusMessage: action.statusMessage,
      }
    case 'finishVoiceSession':
      return {
        ...state,
        draftBeforeVoiceText: '',
        voiceFinalText: '',
        voiceInterimText: '',
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

  const displayText = React.useMemo(
    () =>
      buildVoiceDisplayText({
        draftBeforeVoiceText: state.draftBeforeVoiceText,
        voiceFinalText: state.voiceFinalText,
        voiceInterimText: state.voiceInterimText,
      }),
    [state.draftBeforeVoiceText, state.voiceFinalText, state.voiceInterimText]
  )

  const isVoiceActive = state.voicePhase === 'recording' || state.voicePhase === 'finalizing'

  return {
    ...state,
    displayText,
    isVoiceActive,
    isTextareaReadOnly: isVoiceActive,
    setDraftText: (text: string) => dispatch({ type: 'setDraftText', text }),
    startRecording: () => dispatch({ type: 'startRecording' }),
    updateTranscript: (finalText: string, interimText: string) =>
      dispatch({ type: 'updateTranscript', finalText, interimText }),
    beginFinalizing: (statusMessage?: string | null) =>
      dispatch({ type: 'beginFinalizing', statusMessage }),
    commitVoiceText: (text: string) => dispatch({ type: 'commitVoiceText', text }),
    failVoiceSession: (statusMessage: string) => dispatch({ type: 'failVoiceSession', statusMessage }),
    finishVoiceSession: (statusMessage?: string | null) =>
      dispatch({ type: 'finishVoiceSession', statusMessage }),
    setStatusMessage: (statusMessage: string | null) => dispatch({ type: 'setStatusMessage', statusMessage }),
    resetComposer: () => dispatch({ type: 'reset' }),
  }
}
