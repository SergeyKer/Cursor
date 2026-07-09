import { describe, expect, it } from 'vitest'
import {
  canCommitEngvoAssistantMessage,
  ENGVO_STATUS_CONNECTING,
  ENGVO_STATUS_ENDED,
  ENGVO_STATUS_ERROR_ADULT,
  ENGVO_STATUS_ERROR_CHILD,
  ENGVO_STATUS_IDLE_ADULT,
  ENGVO_STATUS_IDLE_CHILD,
  ENGVO_STATUS_IN_CALL,
  ENGVO_STATUS_SPEAKING,
  formatEngvoInCallFooterText,
  getEngvoBootstrapServiceIndicatorText,
  getEngvoFooterView,
  hasEngvoAssistantChatBubble,
  hasEngvoDialingServiceLineInThread,
  shouldShowEngvoTypingIndicator,
} from './state'

describe('engvo state helpers', () => {
  it('maps phases to stable footer text for adult (live = in call with voice)', () => {
    expect(getEngvoFooterView({ phase: 'idle', userInterimText: '', audience: 'adult' })).toEqual({
      text: ENGVO_STATUS_IDLE_ADULT,
      tone: 'neutral',
    })
    expect(getEngvoFooterView({ phase: 'connecting', userInterimText: '', audience: 'adult' })).toEqual({
      text: ENGVO_STATUS_CONNECTING,
      tone: 'thinking',
    })
    expect(
      getEngvoFooterView({
        phase: 'listening',
        userInterimText: 'hello',
        audience: 'adult',
        voiceDisplayName: 'Eve',
      })
    ).toEqual({
      text: 'В эфире с Eve',
      tone: 'neutral',
    })
    expect(
      getEngvoFooterView({
        phase: 'userFinalizing',
        userInterimText: '',
        audience: 'adult',
        voiceDisplayName: 'Eve',
      })
    ).toEqual({
      text: 'В эфире с Eve',
      tone: 'neutral',
    })
    expect(
      getEngvoFooterView({
        phase: 'assistantPending',
        userInterimText: '',
        audience: 'adult',
        voiceDisplayName: 'Luna',
      })
    ).toEqual({
      text: 'В эфире с Luna',
      tone: 'neutral',
    })
    expect(
      getEngvoFooterView({
        phase: 'assistantSpeaking',
        userInterimText: '',
        audience: 'adult',
        voiceDisplayName: 'Marin',
      })
    ).toEqual({
      text: 'В эфире с Marin',
      tone: 'neutral',
    })
    expect(getEngvoFooterView({ phase: 'ended', userInterimText: '', audience: 'adult' })).toEqual({
      text: ENGVO_STATUS_ENDED,
      tone: 'neutral',
    })
    expect(getEngvoFooterView({ phase: 'error', userInterimText: '', audience: 'adult' })).toEqual({
      text: ENGVO_STATUS_ERROR_ADULT,
      tone: 'error',
    })
  })

  it('maps phases to footer text for child (ты on idle/error; live shared with voice)', () => {
    expect(getEngvoFooterView({ phase: 'idle', userInterimText: '', audience: 'child' })).toEqual({
      text: ENGVO_STATUS_IDLE_CHILD,
      tone: 'neutral',
    })
    expect(
      getEngvoFooterView({
        phase: 'listening',
        userInterimText: '',
        audience: 'child',
        voiceDisplayName: 'Eve',
      })
    ).toEqual({
      text: 'В эфире с Eve',
      tone: 'neutral',
    })
    expect(getEngvoFooterView({ phase: 'error', userInterimText: '', audience: 'child' })).toEqual({
      text: ENGVO_STATUS_ERROR_CHILD,
      tone: 'error',
    })
    expect(
      getEngvoFooterView({
        phase: 'assistantSpeaking',
        userInterimText: '',
        audience: 'child',
        voiceDisplayName: 'Eve',
      })
    ).toEqual({
      text: 'В эфире с Eve',
      tone: 'neutral',
    })
  })

  it('falls back to plain in-call text without voice name', () => {
    expect(formatEngvoInCallFooterText(null)).toBe(ENGVO_STATUS_IN_CALL)
    expect(formatEngvoInCallFooterText('')).toBe(ENGVO_STATUS_IN_CALL)
    expect(
      getEngvoFooterView({ phase: 'listening', userInterimText: '', audience: 'adult' })
    ).toEqual({
      text: ENGVO_STATUS_IN_CALL,
      tone: 'neutral',
    })
  })

  it('maps chat bootstrap indicator without listening leak', () => {
    expect(getEngvoBootstrapServiceIndicatorText('connecting', 'adult')).toBe(ENGVO_STATUS_CONNECTING)
    expect(getEngvoBootstrapServiceIndicatorText('listening', 'adult')).toBeNull()
    expect(getEngvoBootstrapServiceIndicatorText('listening', 'child')).toBeNull()
    expect(getEngvoBootstrapServiceIndicatorText('userFinalizing', 'adult')).toBeNull()
    expect(getEngvoBootstrapServiceIndicatorText('assistantPending', 'adult')).toBe(ENGVO_STATUS_SPEAKING)
    expect(getEngvoBootstrapServiceIndicatorText('assistantSpeaking', 'adult')).toBe(ENGVO_STATUS_SPEAKING)
    expect(getEngvoBootstrapServiceIndicatorText('idle', 'adult')).toBeNull()
    expect(getEngvoBootstrapServiceIndicatorText('ended', 'adult')).toBeNull()
    expect(getEngvoBootstrapServiceIndicatorText('error', 'adult')).toBeNull()
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
