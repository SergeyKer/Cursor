import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT } from '@/lib/engvo/constants'
import type { ChatMessage } from '@/lib/types'

export function withoutEngvoServiceLines(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((message) => !message.engvoServiceLine)
}

export function isEngvoReorderableAssistantMessage(message: ChatMessage | undefined): boolean {
  if (!message || message.role !== 'assistant') return false
  if (message.engvoLocalWelcome === true) return false
  if (message.engvoServiceLine) return false
  if (message.content.trim() === ENGVO_CALL_FINISHED_ASSISTANT_TEXT) return false
  return true
}

export function shouldInsertEngvoUserBeforeAssistant(params: {
  messages: ChatMessage[]
  itemId: string
  assistantCommittedBeforeUser: boolean
  pendingUserItemId: string | null
}): boolean {
  if (params.assistantCommittedBeforeUser) return true

  const withoutDial = withoutEngvoServiceLines(params.messages)
  const last = withoutDial[withoutDial.length - 1]
  return (
    params.pendingUserItemId === params.itemId && isEngvoReorderableAssistantMessage(last)
  )
}

export function insertEngvoUserMessage(
  messages: ChatMessage[],
  content: string,
  insertBeforeLastAssistant: boolean
): ChatMessage[] {
  const withoutDial = withoutEngvoServiceLines(messages)
  const userMessage: ChatMessage = { role: 'user', content }

  if (!insertBeforeLastAssistant) {
    return [...withoutDial, userMessage]
  }

  const last = withoutDial[withoutDial.length - 1]
  if (!isEngvoReorderableAssistantMessage(last)) {
    return [...withoutDial, userMessage]
  }

  return [...withoutDial.slice(0, -1), userMessage, last]
}
