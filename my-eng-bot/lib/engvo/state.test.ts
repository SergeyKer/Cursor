import { describe, expect, it } from 'vitest'
import {
  canCommitEngvoAssistantMessage,
  ENGVO_STATUS_ASSISTANT_PENDING,
  ENGVO_STATUS_ASSISTANT_SPEAKING,
  ENGVO_STATUS_CONNECTING,
  ENGVO_STATUS_LISTENING_CHAT,
  ENGVO_STATUS_USER_FINALIZING_CHAT,
  getEngvoBootstrapServiceIndicatorText,
  getEngvoFooterView,
  hasEngvoAssistantChatBubble,
  hasEngvoDialingServiceLineInThread,
  shouldShowEngvoTypingIndicator,
} from './state'

describe('engvo state helpers', () => {
  it('maps phases to footer text', () => {
    expect(getEngvoFooterView({ phase: 'connecting', userInterimText: '' })).toEqual({
      text: ENGVO_STATUS_CONNECTING,
      tone: 'thinking',
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
      text: ENGVO_STATUS_ASSISTANT_PENDING,
      tone: 'thinking',
    })
    expect(getEngvoFooterView({ phase: 'assistantSpeaking', userInterimText: '' })).toEqual({
      text: ENGVO_STATUS_ASSISTANT_SPEAKING,
      tone: 'thinking',
    })
  })

  it('maps bootstrap indicator text to phases', () => {
    expect(getEngvoBootstrapServiceIndicatorText('connecting')).toBe(ENGVO_STATUS_CONNECTING)
    expect(getEngvoBootstrapServiceIndicatorText('listening')).toBe(ENGVO_STATUS_LISTENING_CHAT)
    expect(getEngvoBootstrapServiceIndicatorText('userFinalizing')).toBe(ENGVO_STATUS_USER_FINALIZING_CHAT)
    expect(getEngvoBootstrapServiceIndicatorText('assistantPending')).toBe(ENGVO_STATUS_ASSISTANT_PENDING)
    expect(getEngvoBootstrapServiceIndicatorText('assistantSpeaking')).toBe(ENGVO_STATUS_ASSISTANT_SPEAKING)
    expect(getEngvoBootstrapServiceIndicatorText('idle')).toBeNull()
    expect(getEngvoBootstrapServiceIndicatorText('ended')).toBeNull()
  })

  it('detects assistant chat bubble excluding welcome and service line', () => {
    expect(hasEngvoAssistantChatBubble([])).toBe(false)
    expect(
      hasEngvoAssistantChatBubble([{ role: 'assistant', content: 'Hi', engvoLocalWelcome: true }])
    ).toBe(false)
    expect(
      hasEngvoAssistantChatBubble([{ role: 'assistant', content: 'Dial', engvoServiceLine: true }])
    ).toBe(false)
    expect(hasEngvoAssistantChatBubble([{ role: 'assistant', content: 'Reply' }])).toBe(true)
  })

  it('detects dialing service line in thread', () => {
    expect(hasEngvoDialingServiceLineInThread([])).toBe(false)
    expect(
      hasEngvoDialingServiceLineInThread([{ role: 'assistant', content: '…', engvoServiceLine: true }])
    ).toBe(true)
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
