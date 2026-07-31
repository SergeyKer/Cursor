import { describe, expect, it } from 'vitest'
import { getExpectedCommunicationReplyLang } from './communicationReplyLanguage'
import type { ChatMessage } from './types'

describe('getExpectedCommunicationReplyLang', () => {
  it('always returns en (product lock EN-only replies)', () => {
    expect(getExpectedCommunicationReplyLang([], { inputPreference: 'ru' })).toBe('en')
    expect(getExpectedCommunicationReplyLang([], { inputPreference: 'en' })).toBe('en')
  })

  it('russian-only user input still expects english reply', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Hello! How are you doing today?' },
      { role: 'user', content: 'как дела дружище' },
    ]
    expect(
      getExpectedCommunicationReplyLang(messages, { inputPreference: 'ru', voiceInputMode: 'ru' }),
    ).toBe('en')
  })

  it('mix mode still english', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'Подробнее' },
    ]
    expect(
      getExpectedCommunicationReplyLang(messages, { inputPreference: 'ru', voiceInputMode: 'mix' }),
    ).toBe('en')
  })
})
