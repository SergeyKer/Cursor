import type { Audience, ChatMessage } from '@/lib/types'

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

/** Shared / audience-split call status copy for footer and chat bootstrap. */
export const ENGVO_STATUS_CONNECTING = 'Набираем Engvo…'
export const ENGVO_STATUS_IN_CALL = 'В эфире.'
export const ENGVO_STATUS_SPEAKING = 'Engvo говорит…'
export const ENGVO_STATUS_ENDED = 'Звонок завершён'

export const ENGVO_STATUS_IDLE_ADULT = 'Нажмите зелёную трубку'
export const ENGVO_STATUS_IDLE_CHILD = 'Нажми зелёную трубку'
export const ENGVO_STATUS_ERROR_ADULT = 'Связь подвела. Попробуйте снова.'
export const ENGVO_STATUS_ERROR_CHILD = 'Связь подвела. Попробуй снова.'

function isChildAudience(audience: Audience | undefined): boolean {
  return audience === 'child'
}

export function getEngvoIdleStatusText(audience: Audience = 'adult'): string {
  return isChildAudience(audience) ? ENGVO_STATUS_IDLE_CHILD : ENGVO_STATUS_IDLE_ADULT
}

export function getEngvoErrorStatusText(audience: Audience = 'adult'): string {
  return isChildAudience(audience) ? ENGVO_STATUS_ERROR_CHILD : ENGVO_STATUS_ERROR_ADULT
}

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
 * Только набор / ответ ИИ — без «Слушаю…» (оно не должно попадать в ленту).
 */
export function getEngvoBootstrapServiceIndicatorText(
  phase: EngvoCallPhase,
  _audience: Audience = 'adult'
): string | null {
  if (phase === 'connecting') return ENGVO_STATUS_CONNECTING
  if (phase === 'assistantPending' || phase === 'assistantSpeaking') {
    return ENGVO_STATUS_SPEAKING
  }
  return null
}

export function getEngvoFooterView(params: {
  phase: EngvoCallPhase
  userInterimText: string
  errorText?: string | null
  audience?: Audience
}): EngvoFooterView {
  const audience = params.audience ?? 'adult'
  if (params.phase === 'error') {
    return {
      text: params.errorText?.trim() || getEngvoErrorStatusText(audience),
      tone: 'error',
    }
  }
  if (params.phase === 'connecting') {
    return { text: ENGVO_STATUS_CONNECTING, tone: 'thinking' }
  }
  if (
    params.phase === 'listening' ||
    params.phase === 'userFinalizing' ||
    params.phase === 'assistantPending' ||
    params.phase === 'assistantSpeaking'
  ) {
    return { text: ENGVO_STATUS_IN_CALL, tone: 'neutral' }
  }
  if (params.phase === 'ended') {
    return { text: ENGVO_STATUS_ENDED, tone: 'neutral' }
  }
  if (params.phase === 'idle') {
    return { text: getEngvoIdleStatusText(audience), tone: 'neutral' }
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
