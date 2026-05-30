import { describe, expect, it } from 'vitest'
import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT } from '@/lib/engvo/constants'
import type { ChatMessage } from '@/lib/types'
import {
  insertEngvoUserMessage,
  shouldCancelEngvoAssistantOnUserAudioCommitted,
  shouldInsertEngvoUserBeforeAssistant,
} from './callMessageOrder'

describe('callMessageOrder', () => {
  it('appends user message when assistant has not replied yet', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: 'Hello!' }]

    expect(insertEngvoUserMessage(messages, 'me too', false)).toEqual([
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'me too' },
    ])
  })

  it('inserts late user message before the latest assistant reply', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Hello!' },
      { role: 'assistant', content: 'Nice to hear that.' },
    ]

    expect(insertEngvoUserMessage(messages, 'me too', true)).toEqual([
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'me too' },
      { role: 'assistant', content: 'Nice to hear that.' },
    ])
  })

  it('reorders only when assistant bubble was committed before user transcript', () => {
    expect(
      shouldInsertEngvoUserBeforeAssistant({
        assistantCommittedBeforeUser: true,
      })
    ).toBe(true)

    expect(
      shouldInsertEngvoUserBeforeAssistant({
        assistantCommittedBeforeUser: false,
      })
    ).toBe(false)
  })

  it('cancels in-flight assistant when user audio is committed', () => {
    expect(shouldCancelEngvoAssistantOnUserAudioCommitted(true)).toBe(true)
    expect(shouldCancelEngvoAssistantOnUserAudioCommitted(false)).toBe(false)
  })

  it('does not reorder before service or finished assistant lines', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT }]

    expect(insertEngvoUserMessage(messages, 'me too', true)).toEqual([
      { role: 'assistant', content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT },
      { role: 'user', content: 'me too' },
    ])
  })
})
