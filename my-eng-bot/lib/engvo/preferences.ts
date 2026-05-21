import {
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_VOICE,
  ENGVO_LEVEL_STORAGE_KEY,
  ENGVO_SPEECH_SPEED_STORAGE_KEY,
  ENGVO_VOICE_STORAGE_KEY,
  getEngvoDefaultCefrLevel,
  isEngvoCefrLevel,
  isEngvoRealtimeVoice,
  isEngvoSpeechSpeedPreset,
  type EngvoCefrLevel,
  type EngvoRealtimeVoice,
  type EngvoSpeechSpeedPresetId,
} from '@/lib/engvo/constants'
import type { Audience } from '@/lib/types'

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
