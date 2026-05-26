import { describe, expect, it } from 'vitest'
import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT } from '@/lib/engvo/constants'
import type { ChatMessage } from '@/lib/types'
import {
  insertEngvoUserMessage,
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

  it('detects reorder when assistant was committed before user transcript', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Hello!' },
      { role: 'assistant', content: 'Nice to hear that.' },
    ]

    expect(
      shouldInsertEngvoUserBeforeAssistant({
        messages,
        itemId: 'item-1',
        assistantCommittedBeforeUser: true,
        pendingUserItemId: 'item-1',
      })
    ).toBe(true)
  })

  it('detects reorder when pending user item matches and last bubble is assistant', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Hello!' },
      { role: 'assistant', content: 'Nice to hear that.' },
    ]

    expect(
      shouldInsertEngvoUserBeforeAssistant({
        messages,
        itemId: 'item-2',
        assistantCommittedBeforeUser: false,
        pendingUserItemId: 'item-2',
      })
    ).toBe(true)
  })

  it('does not reorder before service or finished assistant lines', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT }]

    expect(insertEngvoUserMessage(messages, 'me too', true)).toEqual([
      { role: 'assistant', content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT },
      { role: 'user', content: 'me too' },
    ])
  })
})
