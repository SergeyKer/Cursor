import { describe, expect, it } from 'vitest'
import { getExpectedCommunicationReplyLang } from './communicationReplyLanguage'
import type { ChatMessage } from './types'

describe('getExpectedCommunicationReplyLang', () => {
  it('empty thread: uses inputPreference ru', () => {
    expect(
      getExpectedCommunicationReplyLang([], { inputPreference: 'ru' }),
    ).toBe('ru')
  })

  it('empty thread: uses inputPreference en (inherit new chat / English learners)', () => {
    expect(
      getExpectedCommunicationReplyLang([], { inputPreference: 'en' }),
    ).toBe('en')
  })

  it('last user Latin only -> en', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Здравствуйте! О чём поговорим?' },
      { role: 'user', content: 'Hi' },
    ]
    expect(getExpectedCommunicationReplyLang(messages, { inputPreference: 'ru' })).toBe('en')
  })

  it('last user Cyrillic only -> ru', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Hello! What would you like to discuss?' },
      { role: 'user', content: 'Привет' },
    ]
    expect(getExpectedCommunicationReplyLang(messages, { inputPreference: 'en' })).toBe('ru')
  })
})
