import {
  hasWebSearchForceCode,
  shouldRequestOpenAiWebSearchSources,
  shouldUseOpenAiWebSearch,
} from './openAiWebSearchShared'
import { isCommunicationDetailOnlyMessage } from './communicationReplyLanguage'

type WebSearchContextMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  webSearchTriggered?: boolean
  webSearchSources?: Array<{ url: string }>
}

export function hasRecentWebSearchContext(messages: WebSearchContextMessage[]): boolean {
  const tail = messages.slice(-8)
  return tail.some((m) => {
    if (m.role !== 'assistant') return false
    if (m.webSearchTriggered) return true
    const sourcesLen = m.webSearchSources?.length ?? 0
    // (i) без флага и без сохранённых источников — не считаем «контекстом веб-поиска» (избегаем ложных follow-up).
    return /^\s*\(i\)/i.test(m.content ?? '') && sourcesLen > 0
  })
}

export function isLikelyWebSearchFollowup(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  if (!normalized || normalized.length > 90) return false
  if (/^(?:а|и|ну)\s+[a-zа-яё0-9-]{2,}$/i.test(normalized)) return true
  if (/^(?:also|and)\s+[a-z0-9-]{2,}$/i.test(normalized)) return true
  if (/^(?:а|и|ну|also|and)\b/.test(normalized) && /\b(20\d{2}|за\s+20\d{2}|in\s+20\d{2})\b/.test(normalized)) {
    return true
  }
  return /^(?:а|и|ну|also|and)\b/.test(normalized) && /\b(за|по|про|about|regarding)\b/.test(normalized)
}

export function getCommunicationWebSearchDecision(params: {
  mode: string
  explicitTranslateTarget: string | null
  rawText: string
  cleanedText: string
  recentMessages: WebSearchContextMessage[]
}): {
  requested: boolean
  sourcesRequested: boolean
  hasContext: boolean
} {
  const { mode, explicitTranslateTarget, rawText, cleanedText, recentMessages } = params
  const explicitSearchRequest = shouldUseOpenAiWebSearch(rawText)
  const sourcesRequested = shouldRequestOpenAiWebSearchSources(rawText)
  const hasContext = hasRecentWebSearchContext(recentMessages)
  const forcedWebSearchByCode = hasWebSearchForceCode(rawText)
  const followup = isLikelyWebSearchFollowup(cleanedText)
  const detailOnly = isCommunicationDetailOnlyMessage(cleanedText)

  const requested =
    mode === 'communication' &&
    !explicitTranslateTarget &&
    (forcedWebSearchByCode ||
      explicitSearchRequest ||
      (sourcesRequested && hasContext) ||
      (detailOnly && hasContext) ||
      (followup && hasContext))

  return { requested, sourcesRequested, hasContext }
}
