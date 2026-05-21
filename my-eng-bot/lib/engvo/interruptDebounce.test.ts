import { describe, expect, it } from 'vitest'
import {
  cancelEngvoPendingInterrupt,
  createEngvoInterruptDebounceState,
  hasActiveEngvoAssistantResponse,
  markEngvoInterruptCommitted,
  markEngvoInterruptDebouncePending,
  resetEngvoInterruptDebounceState,
  shouldDebounceEngvoBargeIn,
  shouldIgnoreNoiseTranscriptDuringAssistantSpeech,
} from './interruptDebounce'

describe('hasActiveEngvoAssistantResponse', () => {
  it('true when response in flight', () => {
    expect(hasActiveEngvoAssistantResponse({ responseId: 'r1', responseDone: false })).toBe(true)
  })

  it('false when response finished or missing', () => {
    expect(hasActiveEngvoAssistantResponse({ responseId: 'r1', responseDone: true })).toBe(false)
    expect(hasActiveEngvoAssistantResponse({ responseId: null, responseDone: false })).toBe(false)
  })
})

describe('shouldDebounceEngvoBargeIn', () => {
  it('debounces during assistant phases', () => {
    expect(
      shouldDebounceEngvoBargeIn({ callPhase: 'assistantSpeaking', hasActiveAssistantResponse: false })
    ).toBe(true)
    expect(
      shouldDebounceEngvoBargeIn({ callPhase: 'assistantPending', hasActiveAssistantResponse: false })
    ).toBe(true)
  })

  it('does not debounce while listening only', () => {
    expect(
      shouldDebounceEngvoBargeIn({ callPhase: 'listening', hasActiveAssistantResponse: false })
    ).toBe(false)
  })
})

describe('interrupt debounce state', () => {
  it('cancels pending interrupt on short noise', () => {
    const state = createEngvoInterruptDebounceState()
    markEngvoInterruptDebouncePending(state)
    expect(cancelEngvoPendingInterrupt(state)).toBe(true)
    expect(state.pending).toBe(false)
    expect(state.committed).toBe(false)
  })

  it('does not cancel after interrupt committed', () => {
    const state = createEngvoInterruptDebounceState()
    markEngvoInterruptDebouncePending(state)
    markEngvoInterruptCommitted(state)
    expect(cancelEngvoPendingInterrupt(state)).toBe(false)
  })

  it('reset clears state', () => {
    const state = createEngvoInterruptDebounceState()
    markEngvoInterruptCommitted(state)
    resetEngvoInterruptDebounceState(state)
    expect(state.pending).toBe(false)
    expect(state.committed).toBe(false)
  })
})

describe('shouldIgnoreNoiseTranscriptDuringAssistantSpeech', () => {
  it('ignores кхе while assistant speaks and no barge-in', () => {
    expect(
      shouldIgnoreNoiseTranscriptDuringAssistantSpeech({
        isLikelyNoise: true,
        hasActiveAssistantResponse: true,
        interruptCommitted: false,
      })
    ).toBe(true)
  })

  it('does not ignore after user committed interrupt', () => {
    expect(
      shouldIgnoreNoiseTranscriptDuringAssistantSpeech({
        isLikelyNoise: true,
        hasActiveAssistantResponse: true,
        interruptCommitted: true,
      })
    ).toBe(false)
  })
})
