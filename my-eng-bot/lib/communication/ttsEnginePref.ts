import { featureFlags } from '@/lib/featureFlags'

export type CommunicationTtsEngine = 'system' | 'grok'

const PREF_KEY = 'engvo_communication_tts_engine'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function isCommunicationTtsEngine(value: string): value is CommunicationTtsEngine {
  return value === 'system' || value === 'grok'
}

export function getCommunicationTtsEnginePref(): CommunicationTtsEngine {
  if (!featureFlags.communicationGrokTtsV1) return 'system'
  if (!canUseStorage()) return 'system'
  try {
    const raw = window.localStorage.getItem(PREF_KEY)?.trim() ?? ''
    if (isCommunicationTtsEngine(raw)) return raw
    return 'system'
  } catch {
    return 'system'
  }
}

export function setCommunicationTtsEnginePref(value: CommunicationTtsEngine): void {
  if (!canUseStorage()) return
  if (!featureFlags.communicationGrokTtsV1 && value === 'grok') return
  try {
    window.localStorage.setItem(PREF_KEY, value)
  } catch {
    // ignore
  }
}
