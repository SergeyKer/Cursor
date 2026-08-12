import type { ChatMessage } from '@/lib/types'
import { extractCommunicationSpeakText } from '@/lib/communication/extractCommunicationSpeakText'
import { detectTextLang } from '@/lib/detectTextLang'
import { isErrorLikeAssistantMessage } from '@/lib/errorLikeAssistantMessage'
import { ENGVO_CALL_FINISHED_ASSISTANT_TEXT } from '@/lib/engvo/constants'

const STRIP_REPEAT_LEAD = /^(Скажи|Say|Повтори|Repeat)\s*:?\s*/i

export function resolveCommunicationSpeakText(message: ChatMessage): string {
  if (message.role !== 'assistant') return ''
  if (message.engvoServiceLine) return ''
  if (message.content.trim() === ENGVO_CALL_FINISHED_ASSISTANT_TEXT) return ''
  if (isErrorLikeAssistantMessage(message.content)) return ''
  const extracted = extractCommunicationSpeakText(message.content).replace(STRIP_REPEAT_LEAD, '').trim()
  if (!extracted) return ''
  if (detectTextLang(extracted) === 'ru') return ''
  return extracted
}
