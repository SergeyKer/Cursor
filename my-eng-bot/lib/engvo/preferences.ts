import {
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_VOICE,
  ENGVO_LEVEL_STORAGE_KEY,
  ENGVO_VOICE_STORAGE_KEY,
  isEngvoCefrLevel,
  isEngvoRealtimeVoice,
  type EngvoCefrLevel,
  type EngvoRealtimeVoice,
} from '@/lib/engvo/constants'

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

export function loadEngvoCefrLevel(): EngvoCefrLevel {
  if (typeof window === 'undefined') return ENGVO_DEFAULT_LEVEL
  try {
    const raw = localStorage.getItem(ENGVO_LEVEL_STORAGE_KEY)?.trim() ?? ''
    return isEngvoCefrLevel(raw) ? raw : ENGVO_DEFAULT_LEVEL
  } catch {
    return ENGVO_DEFAULT_LEVEL
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
