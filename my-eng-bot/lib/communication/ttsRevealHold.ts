import { isCommunicationGrokTts } from '@/lib/communication/isCommunicationGrokTts'
import type { CommunicationTtsEngine } from '@/lib/communication/ttsEnginePref'

export type CommunicationTtsRevealTrigger = 'new-message' | 'bootstrap' | 'toggle-on'

export const COMMUNICATION_TTS_REVEAL_TIMEOUT_SYSTEM_MS = 800
export const COMMUNICATION_TTS_REVEAL_TIMEOUT_GROK_MS = 1000

export function shouldHoldCommunicationTtsReveal(trigger: CommunicationTtsRevealTrigger): boolean {
  return trigger === 'new-message'
}

export function resolveCommunicationTtsRevealEngine(text: string): CommunicationTtsEngine {
  return isCommunicationGrokTts(text) ? 'grok' : 'system'
}

export function communicationTtsRevealTimeoutMs(engine: CommunicationTtsEngine): number {
  return engine === 'grok'
    ? COMMUNICATION_TTS_REVEAL_TIMEOUT_GROK_MS
    : COMMUNICATION_TTS_REVEAL_TIMEOUT_SYSTEM_MS
}

export function makeCommunicationAutoSpeakKey(messageCount: number, speakText: string): string {
  return speakText ? `${messageCount}:${speakText}` : `${messageCount}:`
}
