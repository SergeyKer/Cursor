import type { EngvoCallPhase } from '@/lib/engvo/state'

export type EngvoInterruptDebounceState = {
  /** Таймер debounce ещё не сработал. */
  pending: boolean
  /** response.cancel уже отправлен по debounce. */
  committed: boolean
}

export function createEngvoInterruptDebounceState(): EngvoInterruptDebounceState {
  return { pending: false, committed: false }
}

export function resetEngvoInterruptDebounceState(state: EngvoInterruptDebounceState): void {
  state.pending = false
  state.committed = false
}

export function hasActiveEngvoAssistantResponse(params: {
  responseId: string | null
  responseDone: boolean
}): boolean {
  return Boolean(params.responseId) && !params.responseDone
}

/** Нужен debounce перед прерыванием озвучки (кашель не должен срывать ИИ сразу). */
export function shouldDebounceEngvoBargeIn(params: {
  callPhase: EngvoCallPhase
  hasActiveAssistantResponse: boolean
}): boolean {
  return (
    params.hasActiveAssistantResponse ||
    params.callPhase === 'assistantSpeaking' ||
    params.callPhase === 'assistantPending'
  )
}

export function markEngvoInterruptDebouncePending(state: EngvoInterruptDebounceState): void {
  state.pending = true
  state.committed = false
}

export function markEngvoInterruptCommitted(state: EngvoInterruptDebounceState): void {
  state.pending = false
  state.committed = true
}

/**
 * Короткий шум (speech_stopped до срабатывания таймера): отменить pending, не прерывать ИИ.
 * @returns true если pending был отменён
 */
export function cancelEngvoPendingInterrupt(state: EngvoInterruptDebounceState): boolean {
  if (!state.pending || state.committed) return false
  state.pending = false
  return true
}

/** Шумовой транскрипт во время речи ассистента без commit interrupt — не менять фазу звонка. */
export function shouldIgnoreNoiseTranscriptDuringAssistantSpeech(params: {
  isLikelyNoise: boolean
  hasActiveAssistantResponse: boolean
  interruptCommitted: boolean
}): boolean {
  return params.isLikelyNoise && params.hasActiveAssistantResponse && !params.interruptCommitted
}
