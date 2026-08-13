import { featureFlags } from '@/lib/featureFlags'
import { getCommunicationTtsEnginePref } from '@/lib/communication/ttsEnginePref'
import { COMMUNICATION_TTS_MAX_CHARS } from '@/lib/communication/ttsLimits'

export function isCommunicationGrokTts(text: string): boolean {
  const normalized = text.trim()
  return (
    featureFlags.communicationGrokTtsV1 &&
    getCommunicationTtsEnginePref() === 'grok' &&
    normalized.length > 0 &&
    normalized.length <= COMMUNICATION_TTS_MAX_CHARS
  )
}
