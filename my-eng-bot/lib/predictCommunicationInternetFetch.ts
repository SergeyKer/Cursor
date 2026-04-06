import { shouldAllowGismeteoByIntent } from '@/lib/weatherIntentGuard'
import {
  isWeatherFollowupRequest,
  isWeatherForecastRequest,
  stripWebSearchForceCode,
} from '@/lib/openAiWebSearchShared'
import { getCommunicationWebSearchDecision } from '@/lib/webSearchContext'
import { extractWeatherLocationQuery, getLastWeatherLocationQuery } from '@/lib/weatherLocationQuery'
import type { ChatMessage } from '@/lib/types'

type PredictInternetFetchParams = {
  mode: string
  explicitTranslateTarget: string | null
  rawText: string
  messagesWithCurrentUser: ChatMessage[]
  maxContextMessages?: number
}

export function predictWillFetchFromInternet(params: PredictInternetFetchParams): boolean {
  const { mode, explicitTranslateTarget, rawText, messagesWithCurrentUser } = params
  const maxContextMessages = params.maxContextMessages ?? 20
  const recentMessages = messagesWithCurrentUser
    .filter((m) => m.role !== 'system')
    .slice(-maxContextMessages)

  const cleanedText = stripWebSearchForceCode(rawText)
  const webDecision = getCommunicationWebSearchDecision({
    mode,
    explicitTranslateTarget,
    rawText,
    cleanedText,
    recentMessages,
  })

  const weatherFollowupRequested = isWeatherFollowupRequest(cleanedText)
  const shouldAllowGismeteoIntent = shouldAllowGismeteoByIntent({
    text: cleanedText,
    isFollowup: weatherFollowupRequested,
  })
  const weatherLocationQueryOverride = weatherFollowupRequested ? getLastWeatherLocationQuery(recentMessages) : null
  const extractedWeatherLocation = extractWeatherLocationQuery(cleanedText)
  const hasWeatherLocationForGismeteo = Boolean(
    (weatherLocationQueryOverride && weatherLocationQueryOverride.trim()) ||
      (extractedWeatherLocation && extractedWeatherLocation.trim())
  )
  const gismeteoWillRun =
    mode === 'communication' &&
    !explicitTranslateTarget &&
    shouldAllowGismeteoIntent &&
    (isWeatherForecastRequest(cleanedText) || weatherFollowupRequested) &&
    hasWeatherLocationForGismeteo

  return webDecision.requested || gismeteoWillRun
}

