import {
  ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE,
  isEngvoXaiVoiceRotationMode,
  type EngvoXaiVoice,
  type EngvoXaiVoiceRotationMode,
} from '@/lib/engvo/constants'
import { sanitizeXaiVoiceShuffleRemaining } from '@/lib/engvo/xaiVoiceRotation'

const MODE_KEY = 'engvo_communication_tts_rotation_mode'
const SHUFFLE_KEY = 'engvo_communication_tts_shuffle_remaining'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getCommunicationTtsRotationModePref(): EngvoXaiVoiceRotationMode {
  if (!canUseStorage()) return ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE
  try {
    const raw = window.localStorage.getItem(MODE_KEY)?.trim() ?? ''
    if (isEngvoXaiVoiceRotationMode(raw)) return raw
    return ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE
  } catch {
    return ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE
  }
}

export function setCommunicationTtsRotationModePref(value: EngvoXaiVoiceRotationMode): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(MODE_KEY, value)
  } catch {
    // ignore
  }
}

export function getCommunicationTtsShuffleRemaining(): EngvoXaiVoice[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(SHUFFLE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return sanitizeXaiVoiceShuffleRemaining(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return []
  }
}

export function setCommunicationTtsShuffleRemaining(value: readonly EngvoXaiVoice[]): void {
  if (!canUseStorage()) return
  try {
    const clean = sanitizeXaiVoiceShuffleRemaining(value)
    if (clean.length === 0) {
      window.localStorage.removeItem(SHUFFLE_KEY)
      return
    }
    window.localStorage.setItem(SHUFFLE_KEY, JSON.stringify(clean))
  } catch {
    // ignore
  }
}

export function clearCommunicationTtsShuffleRemaining(): void {
  setCommunicationTtsShuffleRemaining([])
}
