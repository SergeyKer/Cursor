import type { ChatMessage } from '@/lib/types'

export type EngvoCallPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'userFinalizing'
  | 'assistantPending'
  | 'assistantSpeaking'
  | 'ended'
  | 'error'

export type EngvoFooterView = {
  text: string | null
  tone: 'neutral' | 'thinking' | 'error'
}

/** Общие подписи для футера и индикатора ожидания в чате при звонке Engvo. */
export const ENGVO_STATUS_CONNECTING = 'Набираем Engvo…'
export const ENGVO_STATUS_LISTENING_CHAT = 'В эфире.'
export const ENGVO_STATUS_USER_FINALIZING_CHAT = 'Фиксирую фразу…'
export const ENGVO_STATUS_ASSISTANT_PENDING = 'Получаю ответ…'
export const ENGVO_STATUS_ASSISTANT_SPEAKING = 'Engvo отвечает…'

/** Содержательный ответ ассистента в ленте (не приветствие и не служебная строка набора). */
export function hasEngvoAssistantChatBubble(messages: readonly ChatMessage[]): boolean {
  return messages.some(
    (m) =>
      m.role === 'assistant' &&
      m.engvoLocalWelcome !== true &&
      !m.engvoServiceLine
  )
}

/** Центрированная строка набора («Набираем Engvo…») ещё в ленте. */
export function hasEngvoDialingServiceLineInThread(messages: readonly ChatMessage[]): boolean {
  return messages.some((m) => Boolean(m.engvoServiceLine))
}

/**
 * Текст полоски ожидания в чате до первого ответа ассистента в ленте.
 * Два стабильных состояния: набор, затем «Engvo отвечает…» без смены подписи на каждую фазу.
 */
export function getEngvoBootstrapServiceIndicatorText(phase: EngvoCallPhase): string | null {
  if (phase === 'connecting') return ENGVO_STATUS_CONNECTING
  if (phase === 'listening') return ENGVO_STATUS_LISTENING_CHAT
  if (phase === 'userFinalizing') return ENGVO_STATUS_USER_FINALIZING_CHAT
  if (phase === 'assistantPending') return ENGVO_STATUS_ASSISTANT_PENDING
  if (phase === 'assistantSpeaking') return ENGVO_STATUS_ASSISTANT_SPEAKING
  return null
}

export function getEngvoFooterView(params: {
  phase: EngvoCallPhase
  userInterimText: string
  errorText?: string | null
}): EngvoFooterView {
  if (params.phase === 'error') {
    return {
      text: params.errorText?.trim() || 'Связь подвела. Попробуйте снова.',
      tone: 'error',
    }
  }
  if (params.phase === 'userFinalizing') {
    return { text: ENGVO_STATUS_USER_FINALIZING_CHAT, tone: 'thinking' }
  }
  if (params.phase === 'listening' && params.userInterimText.trim()) {
    return { text: 'Слышу…', tone: 'neutral' }
  }
  if (params.phase === 'listening') {
    return { text: ENGVO_STATUS_LISTENING_CHAT, tone: 'neutral' }
  }
  if (params.phase === 'connecting') {
    return { text: ENGVO_STATUS_CONNECTING, tone: 'thinking' }
  }
  if (params.phase === 'assistantPending') {
    return { text: ENGVO_STATUS_ASSISTANT_PENDING, tone: 'thinking' }
  }
  if (params.phase === 'assistantSpeaking') {
    return { text: ENGVO_STATUS_ASSISTANT_SPEAKING, tone: 'thinking' }
  }
  return { text: null, tone: 'neutral' }
}

export function shouldShowEngvoTypingIndicator(params: {
  engvoVoiceMode: boolean
  phase: EngvoCallPhase
  messagesLength: number
}): boolean {
  if (!params.engvoVoiceMode) return false
  if (params.messagesLength === 0) return false
  return params.phase === 'assistantPending' || params.phase === 'assistantSpeaking'
}

export function canCommitEngvoAssistantMessage(params: {
  responseDone: boolean
  playbackPendingCount: number
  finalText: string
  alreadyCommittedResponseIds: Set<string>
  responseId: string | null
}): boolean {
  if (!params.responseDone) return false
  if (params.playbackPendingCount > 0) return false
  if (!params.finalText.trim()) return false
  if (!params.responseId) return false
  if (params.alreadyCommittedResponseIds.has(params.responseId)) return false
  return true
}
