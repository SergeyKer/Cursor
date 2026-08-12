import {
  ENGVO_XAI_DEFAULT_VOICE,
  isEngvoAllowedXaiVoice,
  type EngvoXaiCallVoice,
} from '@/lib/engvo/constants'

const PREF_KEY = 'engvo_vocab_tts_voice'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Default luna. Invalid / missing → luna. Independent from Engvo call voice. */
export function getVocabTtsVoicePref(): EngvoXaiCallVoice {
  if (!canUseStorage()) return ENGVO_XAI_DEFAULT_VOICE
  try {
    const raw = window.localStorage.getItem(PREF_KEY)?.trim() ?? ''
    if (isEngvoAllowedXaiVoice(raw)) return raw
    return ENGVO_XAI_DEFAULT_VOICE
  } catch {
    return ENGVO_XAI_DEFAULT_VOICE
  }
}

export function setVocabTtsVoicePref(value: string): void {
  if (!canUseStorage()) return
  if (!isEngvoAllowedXaiVoice(value)) return
  try {
    window.localStorage.setItem(PREF_KEY, value)
  } catch {
    // ignore
  }
}
