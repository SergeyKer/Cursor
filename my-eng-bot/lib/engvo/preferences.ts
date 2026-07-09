import {
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_PROVIDER,
  ENGVO_DEFAULT_VOICE,
  ENGVO_LEVEL_STORAGE_KEY,
  ENGVO_PROVIDER_STORAGE_KEY,
  ENGVO_SPEECH_SPEED_STORAGE_KEY,
  ENGVO_VOICE_STORAGE_KEY,
  ENGVO_XAI_DEFAULT_VOICE,
  ENGVO_XAI_VOICE_STORAGE_KEY,
  getEngvoDefaultCefrLevel,
  getEngvoDefaultSpeechSpeedPreset,
  getEngvoDefaultVoice,
  isEngvoCefrLevel,
  isEngvoProvider,
  isEngvoRealtimeVoice,
  isEngvoSpeechSpeedPreset,
  isEngvoXaiVoice,
  type EngvoCefrLevel,
  type EngvoProvider,
  type EngvoRealtimeVoice,
  type EngvoSpeechSpeedPresetId,
  type EngvoXaiVoice,
} from '@/lib/engvo/constants'
import type { Audience } from '@/lib/types'

export function loadEngvoProvider(): EngvoProvider {
  if (typeof window === 'undefined') return ENGVO_DEFAULT_PROVIDER
  try {
    const raw = localStorage.getItem(ENGVO_PROVIDER_STORAGE_KEY)?.trim() ?? ''
    return isEngvoProvider(raw) ? raw : ENGVO_DEFAULT_PROVIDER
  } catch {
    return ENGVO_DEFAULT_PROVIDER
  }
}

export function saveEngvoProvider(value: EngvoProvider): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ENGVO_PROVIDER_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoRealtimeVoice(): EngvoRealtimeVoice {
  if (typeof window === 'undefined') return ENGVO_DEFAULT_VOICE
  try {
    const raw = localStorage.getItem(ENGVO_VOICE_STORAGE_KEY)?.trim() ?? ''
    return isEngvoRealtimeVoice(raw) ? raw : ENGVO_DEFAULT_VOICE
  } catch {
    return ENGVO_DEFAULT_VOICE
  }
}

export function saveEngvoRealtimeVoice(value: EngvoRealtimeVoice): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ENGVO_VOICE_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoXaiVoice(): EngvoXaiVoice {
  if (typeof window === 'undefined') return ENGVO_XAI_DEFAULT_VOICE
  try {
    const raw = localStorage.getItem(ENGVO_XAI_VOICE_STORAGE_KEY)?.trim() ?? ''
    return isEngvoXaiVoice(raw) ? raw : ENGVO_XAI_DEFAULT_VOICE
  } catch {
    return ENGVO_XAI_DEFAULT_VOICE
  }
}

export function saveEngvoXaiVoice(value: EngvoXaiVoice): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ENGVO_XAI_VOICE_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoVoiceForProvider(provider: EngvoProvider): EngvoRealtimeVoice | EngvoXaiVoice {
  return provider === 'xai' ? loadEngvoXaiVoice() : loadEngvoRealtimeVoice()
}

export function saveEngvoVoiceForProvider(
  provider: EngvoProvider,
  value: string
): void {
  if (provider === 'xai') {
    if (isEngvoXaiVoice(value)) saveEngvoXaiVoice(value)
    return
  }
  if (isEngvoRealtimeVoice(value)) saveEngvoRealtimeVoice(value)
}

/** When switching provider, keep each roster's last voice; return voice for the new provider. */
export function resolveVoiceAfterProviderChange(provider: EngvoProvider): EngvoRealtimeVoice | EngvoXaiVoice {
  const loaded = loadEngvoVoiceForProvider(provider)
  return loaded || getEngvoDefaultVoice(provider)
}

export function loadEngvoCefrLevel(audience?: Audience): EngvoCefrLevel {
  const fallback = audience ? getEngvoDefaultCefrLevel(audience) : ENGVO_DEFAULT_LEVEL
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(ENGVO_LEVEL_STORAGE_KEY)?.trim() ?? ''
    return isEngvoCefrLevel(raw) ? raw : fallback
  } catch {
    return fallback
  }
}

export function saveEngvoCefrLevel(value: EngvoCefrLevel): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ENGVO_LEVEL_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoSpeechSpeedPreset(): EngvoSpeechSpeedPresetId | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ENGVO_SPEECH_SPEED_STORAGE_KEY)?.trim() ?? ''
    if (!raw) return null
    return isEngvoSpeechSpeedPreset(raw) ? raw : null
  } catch {
    return null
  }
}

export function saveEngvoSpeechSpeedPreset(value: EngvoSpeechSpeedPresetId): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ENGVO_SPEECH_SPEED_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

/** Сохранённый пресет пользователя или дефолт по аудитории и CEFR (A1 → спокойная). */
export function resolveEngvoSpeechSpeedPreset(params: {
  audience: Audience
  level: EngvoCefrLevel
  stored?: EngvoSpeechSpeedPresetId | null
}): EngvoSpeechSpeedPresetId {
  const stored = params.stored ?? loadEngvoSpeechSpeedPreset()
  if (stored) return stored
  return getEngvoDefaultSpeechSpeedPreset(params.audience, params.level)
}
