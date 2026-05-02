import type { AccentAttemptRuntime, AccentBlockFeedback } from '@/types/accent'

export type AccentBlockEvent =
  | { type: 'START_RECORDING'; attemptId: string }
  | { type: 'FINALIZE_RECORDING' }
  | { type: 'SUBMIT_PREVIEW' }
  | { type: 'SHOW_FEEDBACK'; feedback: AccentBlockFeedback }
  | { type: 'COMPLETE_BLOCK' }
  | { type: 'RESET' }

export interface AccentBlockRuntimeState extends AccentAttemptRuntime {
  feedback: AccentBlockFeedback | null
}

export const initialAccentBlockState: AccentBlockRuntimeState = {
  attemptId: '',
  state: 'idle',
  finalized: false,
  feedback: null,
}

export function reduceAccentBlockState(
  current: AccentBlockRuntimeState,
  event: AccentBlockEvent
): AccentBlockRuntimeState {
  switch (event.type) {
    case 'START_RECORDING':
      if (current.state !== 'idle' && current.state !== 'complete') return current
      return {
        attemptId: event.attemptId,
        state: 'recording',
        finalized: false,
        feedback: null,
      }

    case 'FINALIZE_RECORDING':
      if (current.state === 'preview' && current.finalized) return current
      if (current.state !== 'recording') return current
      return {
        ...current,
        state: 'preview',
        finalized: true,
      }

    case 'SUBMIT_PREVIEW':
      if (current.state !== 'preview') return current
      return {
        ...current,
        state: 'submitting',
      }

    case 'SHOW_FEEDBACK':
      if (current.state !== 'submitting') return current
      return {
        ...current,
        state: 'feedback',
        feedback: event.feedback,
      }

    case 'COMPLETE_BLOCK':
      if (current.state !== 'feedback') return current
      return {
        ...current,
        state: 'complete',
      }

    case 'RESET':
      return initialAccentBlockState

    default:
      return current
  }
}

export function createAccentAttemptId(prefix = 'accent'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
