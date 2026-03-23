import type { ChatMessage, CommunicationInputExpectedLang } from '@/lib/types'
import { detectLangFromText, type DetectedLang } from '@/lib/detectLang'

export function normalizeCommunicationDetailText(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е').trim().replace(/[.!?…]+$/g, '').replace(/\s+/g, ' ')
}

export function stripCommunicationDetailKeywords(text: string): string {
  return text
    .replace(/\b(?:еще|ещё)\s+подробнее\b/gi, ' ')
    .replace(/\bподробнее\b/gi, ' ')
    .replace(/\beven\s+more\s+details?\b/gi, ' ')
    .replace(/\beven\s+more\s+detail\b/gi, ' ')
    .replace(/\bmore\s+details?\b/gi, ' ')
    .replace(/\bin\s+even\s+more\s+detail(?:s)?\b/gi, ' ')
    .replace(/\bin\s+more\s+detail(?:s)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCommunicationDetailOnlyMessage(text: string): boolean {
  const normalized = normalizeCommunicationDetailText(text)
  return [
    'подробнее',
    'еще подробнее',
    'more detail',
    'more details',
    'even more detail',
    'even more details',
    'in more detail',
    'in more details',
    'in even more detail',
    'in even more details',
  ].includes(normalized)
}

/**
 * Режим общения: язык сообщения по «раскладке» текста — как на клиенте (speechLocaleForCommunication).
 * Есть кириллица → ru; только латиница → en; только цифры/знаки → tieBreak.
 */
export function detectCommunicationUserMessageLang(text: string, tieBreak: DetectedLang): DetectedLang {
  const t = text.trim()
  if (!t) return tieBreak
  const hasCyr = /[А-Яа-яЁё]/.test(t)
  const hasLat = /[A-Za-z]/.test(t)
  if (hasCyr && hasLat) return tieBreak
  if (hasCyr) return 'ru'
  if (hasLat) return 'en'
  return tieBreak
}

/** Язык ожидаемого ответа ИИ в режиме communication — как `detectedUserLang` в api/chat/route. */
export function getExpectedCommunicationReplyLang(
  messages: ChatMessage[],
  options?: { inputPreference?: CommunicationInputExpectedLang }
): DetectedLang {
  const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const lastAssistantContentForLangTie = [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  const lastAssistantLang = detectLangFromText(lastAssistantContentForLangTie, 'ru')
  const communicationDetailOnly = isCommunicationDetailOnlyMessage(lastUserText)
  const communicationLanguageProbe = stripCommunicationDetailKeywords(lastUserText)
  const tieBreak = options?.inputPreference ?? lastAssistantLang
  return communicationDetailOnly
    ? lastAssistantLang
    : detectCommunicationUserMessageLang(communicationLanguageProbe, tieBreak)
}
