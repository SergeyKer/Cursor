import { describe, expect, it } from 'vitest'
import { resolveCommunicationSpeakText } from '@/lib/communication/resolveCommunicationSpeakText'
import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT } from '@/lib/engvo/constants'

describe('resolveCommunicationSpeakText', () => {
  it('uses English invite after Russian CEFR warn', () => {
    const text = resolveCommunicationSpeakText({
      role: 'assistant',
      content: 'Мы общаемся только по-английски.\nHello! What do you want to talk about today?',
    })
    expect(text).toBe('Hello! What do you want to talk about today?')
  })

  it('skips Russian-only and service lines', () => {
    expect(
      resolveCommunicationSpeakText({
        role: 'assistant',
        content: 'Набираем Engvo…',
        engvoServiceLine: true,
      })
    ).toBe('')
    expect(
      resolveCommunicationSpeakText({
        role: 'assistant',
        content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT,
      })
    ).toBe('')
    expect(
      resolveCommunicationSpeakText({
        role: 'assistant',
        content: 'Только русский текст без латиницы',
      })
    ).toBe('')
  })

  it('skips user messages', () => {
    expect(resolveCommunicationSpeakText({ role: 'user', content: 'Hello' })).toBe('')
  })
})
