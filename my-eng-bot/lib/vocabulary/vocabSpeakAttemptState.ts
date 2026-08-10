export type VocabSpeakAttemptPhase =
  | 'idle'
  | 'playing'
  | 'cueStart'
  | 'recording'
  | 'cueStop'
  | 'finalizing'
  | 'preview'

export type VocabSpeakAttemptEvent =
  | { type: 'START_PLAYING' }
  | { type: 'ETALON_ENDED' }
  | { type: 'CUE_START_DONE' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'CUE_STOP_DONE' }
  | { type: 'FINALIZING' }
  | { type: 'PREVIEW_READY' }
  | { type: 'RESET' }
  | { type: 'CANCEL' }

export type VocabSpeakAttemptRuntime = {
  phase: VocabSpeakAttemptPhase
}

export const initialVocabSpeakAttemptState: VocabSpeakAttemptRuntime = {
  phase: 'idle',
}

export function reduceVocabSpeakAttempt(
  current: VocabSpeakAttemptRuntime,
  event: VocabSpeakAttemptEvent
): VocabSpeakAttemptRuntime {
  switch (event.type) {
    case 'RESET':
    case 'CANCEL':
      return initialVocabSpeakAttemptState

    case 'START_PLAYING':
      if (current.phase !== 'idle' && current.phase !== 'preview') return current
      return { phase: 'playing' }

    case 'ETALON_ENDED':
      if (current.phase !== 'playing') return current
      return { phase: 'cueStart' }

    case 'CUE_START_DONE':
      if (current.phase !== 'cueStart') return current
      return { phase: 'recording' }

    case 'START_RECORDING':
      if (current.phase !== 'cueStart' && current.phase !== 'recording') return current
      return { phase: 'recording' }

    case 'STOP_RECORDING':
      if (current.phase !== 'recording') return current
      return { phase: 'cueStop' }

    case 'CUE_STOP_DONE':
      if (current.phase !== 'cueStop') return current
      return { phase: 'finalizing' }

    case 'FINALIZING':
      if (current.phase !== 'cueStop' && current.phase !== 'finalizing') return current
      return { phase: 'finalizing' }

    case 'PREVIEW_READY':
      if (
        current.phase !== 'finalizing' &&
        current.phase !== 'cueStop' &&
        current.phase !== 'recording'
      ) {
        return current
      }
      return { phase: 'preview' }

    default:
      return current
  }
}

export type VocabHeardAttempt = {
  id: string
  transcript: string
  audioUrl: string | null
}

export function createVocabAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `vocab-attempt-${crypto.randomUUID()}`
  }
  return `vocab-attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
