import type { ChatMessage } from './types'

/**
 * Считает "финально правильные ответы" в режиме `dialogue`.
 *
 * Правильным засчитывается assistant-сообщение, которое:
 * - идёт сразу после user-сообщения;
 * - помечено сервером как `dialogueCorrect`.
 */
export function countDialogueFinalCorrectAnswers(messages: ChatMessage[]): number {
  let count = 0
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1]
    const cur = messages[i]
    if (cur.role !== 'assistant') continue
    if (prev.role !== 'user') continue
    if (cur.dialogueCorrect) count++
  }
  return count
}

