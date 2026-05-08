import { describe, expect, it } from 'vitest'
import { canCommitEngvoAssistantMessage, getEngvoFooterView, shouldShowEngvoTypingIndicator } from './state'

describe('engvo state helpers', () => {
  it('maps phases to footer text', () => {
    expect(getEngvoFooterView({ phase: 'connecting', userInterimText: '' })).toEqual({
      text: null,
      tone: 'neutral',
    })
    expect(getEngvoFooterView({ phase: 'listening', userInterimText: 'hello' })).toEqual({
      text: 'Слышу…',
      tone: 'neutral',
    })
    expect(getEngvoFooterView({ phase: 'userFinalizing', userInterimText: '' })).toEqual({
      text: 'Фиксирую фразу…',
      tone: 'thinking',
    })
    expect(getEngvoFooterView({ phase: 'assistantPending', userInterimText: '' })).toEqual({
      text: null,
      tone: 'neutral',
    })
  })

  it('shows typing indicator only for assistant pending/speaking in engvo mode', () => {
    expect(
      shouldShowEngvoTypingIndicator({
        engvoVoiceMode: true,
        phase: 'assistantPending',
        messagesLength: 2,
      })
    ).toBe(true)
    expect(
      shouldShowEngvoTypingIndicator({
        engvoVoiceMode: true,
        phase: 'assistantSpeaking',
        messagesLength: 2,
      })
    ).toBe(true)
    expect(
      shouldShowEngvoTypingIndicator({
        engvoVoiceMode: false,
        phase: 'assistantPending',
        messagesLength: 2,
      })
    ).toBe(false)
  })

  it('commits assistant bubble only when response is done, playback drained and response is not duplicated', () => {
    expect(
      canCommitEngvoAssistantMessage({
        responseDone: true,
        playbackPendingCount: 0,
        finalText: 'Hello there',
        alreadyCommittedResponseIds: new Set(),
        responseId: 'resp-1',
      })
    ).toBe(true)

    expect(
      canCommitEngvoAssistantMessage({
        responseDone: false,
        playbackPendingCount: 0,
        finalText: 'Hello there',
        alreadyCommittedResponseIds: new Set(),
        responseId: 'resp-1',
      })
    ).toBe(false)

    expect(
      canCommitEngvoAssistantMessage({
        responseDone: true,
        playbackPendingCount: 1,
        finalText: 'Hello there',
        alreadyCommittedResponseIds: new Set(),
        responseId: 'resp-1',
      })
    ).toBe(false)

    expect(
      canCommitEngvoAssistantMessage({
        responseDone: true,
        playbackPendingCount: 0,
        finalText: 'Hello there',
        alreadyCommittedResponseIds: new Set(['resp-1']),
        responseId: 'resp-1',
      })
    ).toBe(false)
  })
})
