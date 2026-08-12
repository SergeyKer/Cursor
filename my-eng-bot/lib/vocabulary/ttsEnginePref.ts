import { featureFlags } from '@/lib/featureFlags'

export type VocabTtsEngine = 'system' | 'grok'

const PREF_KEY = 'engvo_vocab_tts_engine'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function isVocabTtsEngine(value: string): value is VocabTtsEngine {
  return value === 'system' || value === 'grok'
}

/** Default Grok. Kill-switch forces system. */
export function getVocabTtsEnginePref(): VocabTtsEngine {
  if (!featureFlags.vocabGrokTtsV1) return 'system'
  if (!canUseStorage()) return 'grok'
  try {
    const raw = window.localStorage.getItem(PREF_KEY)?.trim() ?? ''
    if (isVocabTtsEngine(raw)) return raw
    return 'grok'
  } catch {
    return 'grok'
  }
}

export function setVocabTtsEnginePref(value: VocabTtsEngine): void {
  if (!canUseStorage()) return
  if (!featureFlags.vocabGrokTtsV1 && value === 'grok') return
  try {
    window.localStorage.setItem(PREF_KEY, value)
  } catch {
    // ignore
  }
}
