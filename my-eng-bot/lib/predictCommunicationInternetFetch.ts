import type { ChatMessage } from '@/lib/types'

type PredictInternetFetchParams = {
  mode: string
  explicitTranslateTarget: string | null
  rawText: string
  messagesWithCurrentUser: ChatMessage[]
  maxContextMessages?: number
}

/** Product lock: Общение без внешних fetch (web/Gismeteo). Signature kept for call sites. */
export function predictWillFetchFromInternet(_params: PredictInternetFetchParams): boolean {
  return false
}
