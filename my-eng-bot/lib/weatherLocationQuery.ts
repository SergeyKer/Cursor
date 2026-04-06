/**
 * Парсинг локации из запроса о погоде — только чистая логика, без fetch/Node.
 * Используется на клиенте (индикатор «ищет в интернете») и на сервере.
 */
import type { ChatMessage } from '@/lib/types'
import { isWeatherFollowupRequest, isWeatherForecastRequest } from '@/lib/openAiWebSearchShared'

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** Сообщение только про «тему погоды» без названия места (в т.ч. кириллица: \b в RegExp ненадёжен). */
function isBareWeatherTopicWithoutPlaceName(text: string): boolean {
  const n = normalizeText(text).toLowerCase()
  if (!n) return true
  if (
    /^(?:давай\s+)?(?:поговорим|обсудим|поболтаем)\s+(?:про|о)\s+(?:погод[а-яё]*|температур[а-яё]*|прогноз(?:\s+погоды)?)$/.test(
      n
    )
  )
    return true
  if (
    /^(?:let'?s\s+)?(?:talk|discuss|chat)\s+(?:about)\s+(?:(?:the|a|an)\s+)?(?:weather|forecast|temperature)$/.test(
      n
    )
  )
    return true
  if (/^(weather|forecast|temperature|wheather|whether)$/i.test(n)) return true
  if (/^погод[а-яё]{0,4}$/.test(n)) return true
  if (/^температур[а-яё]{0,4}$/.test(n)) return true
  if (/^прогноз(?:\s+погоды)?$/.test(n)) return true
  return false
}

export function extractWeatherLocationQuery(text: string): string | null {
  const normalized = normalizeText(text)
  if (!normalized) return null

  const weatherNoisePattern =
    /\b(?:сейчас|сегодня|завтра|послезавтра|вчера|weather|forecast|weekends?|прогноз(?:\s+погоды)?|погода|температур[а-яё]*|выходн(?:ые|ых|ым|ыми|ах|ам|ую)?|понедельник(?:а|у|ом|е)?|вторник(?:а|у|ом|е)?|сред(?:а|у|е|ой)|четверг(?:а|у|ом|е)?|пятниц(?:а|у|е|ей)|суббот(?:а|у|е|ой)|воскресень(?:е|я|ю|ем)|current|today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|next\s+month|на\s+3\s*дн(?:я|ей)|на\s+недел(?:ю|е)|на\s+месяц)\b/gi
  const temporalTailPattern =
    /\b(?:in\s+\d+\s*(?:days?|weeks?|months?)|next\s+\d+\s*(?:days?|weeks?|months?)|in\s+\d+\s*(?:дн(?:я|ей)|недел[юи]|месяц(?:а|е)?)|через\s+\d+\s*(?:дн(?:я|ей)|недел[юи]|месяц(?:а|ев)?))\b/gi
  const trailingConnectorPattern = /(?:\s+(?:в|для|по|на|in|for|at|on|to))+\s*$/i

  const normalizeLocationCandidate = (value: string): string => {
    return normalizeText(
      value
        .replace(weatherNoisePattern, ' ')
        // Кириллица + \b в JS бывает нестабильна, поэтому отдельно вычищаем словоформы дней/выходных.
        .replace(
          /(?:понедельник(?:а|у|ом|е)?|вторник(?:а|у|ом|е)?|сред(?:а|у|е|ой)|четверг(?:а|у|ом|е)?|пятниц(?:а|у|е|ей)|суббот(?:а|у|е|ой)|воскресень(?:е|я|ю|ем)|выходн(?:ые|ых|ым|ыми|ах|ам|ую)?)/gi,
          ' '
        )
        .replace(temporalTailPattern, ' ')
        .replace(/[,.!?;:]+/g, ' ')
        .replace(/^(?:the|a|an)\s+/i, '')
        .replace(trailingConnectorPattern, ' ')
    )
  }

  const tailMatch = normalized.match(/(?:^|\s)(?:в|для|по|in|for)\s+(.+)$/i)
  if (tailMatch?.[1]) {
    const tailRaw = normalizeText(tailMatch[1])
    const candidate = normalizeLocationCandidate(tailRaw)
    const looksLikeActivityWeekendTail =
      /(?:выходн(?:ые|ых|ым|ыми|ах|ам|ую)?|weekends?)/i.test(tailRaw) &&
      /(?:игр|played|play|футбол|football|тренир|ходил|ходили|занимал|занимались)/i.test(tailRaw)
    const looksLikeNarrativeTail =
      /(?:понедельник(?:а|у|ом|е)?|вторник(?:а|у|ом|е)?|сред(?:а|у|е|ой)|четверг(?:а|у|ом|е)?|пятниц(?:а|у|е|ей)|суббот(?:а|у|е|ой)|воскресень(?:е|я|ю|ем)|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
        tailRaw
      ) &&
      /(?:был[аои]?|was|were|не\s+очень|good|bad|great)/i.test(tailRaw)
    if (candidate && !looksLikeActivityWeekendTail && !looksLikeNarrativeTail) return normalizeText(candidate)
  }

  const cleaned = normalizeLocationCandidate(
    normalized.replace(/\b(?:какая|какой|какое|какие|какова|what\s+is|what's|what\s+will\s+be)\b/gi, ' ')
  )

  if (cleaned && isBareWeatherTopicWithoutPlaceName(cleaned)) return null
  if (
    /погод[а-яё]*/i.test(cleaned) &&
    /(?:был[аои]?|не\s+очень|очень|хорош[а-я]*|плох[а-я]*)/i.test(cleaned)
  ) {
    return null
  }
  if (/^(?:every|each|all)$/i.test(cleaned)) return null
  if (/^(?:играли|играл|играла|played|play|we|мы)$/i.test(cleaned)) return null
  if (/^(?:был[аои]?|не\s+очень|очень|хорош[а-я]*|плох[а-я]*)(?:\s+\S+){0,5}$/i.test(cleaned)) return null
  if (
    /(?:выходн(?:ые|ых|ым|ыми|ах|ам|ую)?|weekends?)/i.test(normalized) &&
    !/(?:weather|forecast|погод[а-яё]*|прогноз|температур[а-яё]*)/i.test(normalized) &&
    /(?:игр|played|play|футбол|football|тренир|ходил|ходили|занимал|занимались)/i.test(normalized)
  ) {
    return null
  }

  return cleaned || null
}

export function getLastWeatherLocationQuery(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 2; i >= 0; i--) {
    const message = messages[i]
    if (!message || message.role !== 'user') continue
    if (isWeatherFollowupRequest(message.content)) continue
    if (!isWeatherForecastRequest(message.content)) continue

    const locationQuery = extractWeatherLocationQuery(message.content)
    if (locationQuery) return locationQuery
  }
  return null
}
