import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT } from '@/lib/engvo/constants'
import { shouldReplaceEngvoUserTranscript } from '@/lib/engvo/xaiListenPolicy'
import type { ChatMessage } from '@/lib/types'

export { shouldReplaceEngvoUserTranscript }

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

/** Отменить текущий ответ ассистента, когда пользователь уже зафиксировал новую реплику. */
export function shouldCancelEngvoAssistantOnUserAudioCommitted(
  hasActiveAssistantResponse: boolean
): boolean {
  return hasActiveAssistantResponse
}

export function shouldInsertEngvoUserBeforeAssistant(params: {
  assistantCommittedBeforeUser: boolean
}): boolean {
  return params.assistantCommittedBeforeUser
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

/**
 * Replace content of the last user bubble.
 * When `requireReplaceGate` is true (xAI), only prefix/near-equal updates apply.
 */
export function updateLastEngvoUserMessage(
  messages: ChatMessage[],
  content: string,
  options?: { requireReplaceGate?: boolean }
): ChatMessage[] {
  const trimmed = content.trim()
  if (!trimmed) return messages

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== 'user' || message.engvoServiceLine) continue
    if (message.content === trimmed) return messages
    if (
      options?.requireReplaceGate &&
      !shouldReplaceEngvoUserTranscript(message.content, trimmed)
    ) {
      return messages
    }
    const next = [...messages]
    next[i] = { ...message, content: trimmed }
    return next
  }
  return messages
}
