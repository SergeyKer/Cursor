import type { ChatMessage } from '@/lib/types'
import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT, ENGVO_DIALING_ASSISTANT_TEXT } from '@/lib/engvo/constants'
import { isErrorLikeAssistantMessage } from '@/lib/errorLikeAssistantMessage'

const MAX_REPLAY_MESSAGES = 36
const MAX_REPLAY_TOTAL_CHARS = 14_000

/** Элемент `item` для клиентского события `conversation.item.create` (Realtime WebRTC). */
export type EngvoRealtimeReplayItem = Record<string, unknown>

function trimForReplay(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function userContentPart(text: string): Record<string, unknown> {
  return { type: 'input_text', text }
}

function assistantContentPart(text: string): Record<string, unknown> {
  return { type: 'text', text }
}

function shouldSkipMessage(m: ChatMessage): boolean {
  if (m.role !== 'user' && m.role !== 'assistant') return true
  if (m.engvoServiceLine) return true
  if (m.role === 'assistant' && m.engvoLocalWelcome) return true
  const t = trimForReplay(m.content)
  if (!t) return true
  if (t === ENGVO_CALL_FINISHED_ASSISTANT_TEXT || t === ENGVO_DIALING_ASSISTANT_TEXT) return true
  if (m.role === 'assistant' && isErrorLikeAssistantMessage(t)) return true
  return false
}

/**
 * Отбирает сообщения для восстановления контекста в новой Realtime-сессии.
 * Возвращает массив `item` для последовательной отправки `conversation.item.create`.
 */
export function buildEngvoRealtimeReplayItems(messages: ChatMessage[]): EngvoRealtimeReplayItem[] {
  const filtered: ChatMessage[] = []
  let charBudget = 0

  for (const m of messages) {
    if (shouldSkipMessage(m)) continue
    const t = trimForReplay(m.content)
    if (!t) continue
    const nextBudget = charBudget + t.length
    if (nextBudget > MAX_REPLAY_TOTAL_CHARS) break
    charBudget = nextBudget
    filtered.push({ ...m, content: t })
    if (filtered.length >= MAX_REPLAY_MESSAGES) break
  }

  const items: EngvoRealtimeReplayItem[] = []
  for (const m of filtered) {
    if (m.role === 'user') {
      items.push({
        type: 'message',
        role: 'user',
        content: [userContentPart(m.content)],
      })
    } else {
      items.push({
        type: 'message',
        role: 'assistant',
        content: [assistantContentPart(m.content)],
      })
    }
  }

  return items
}
