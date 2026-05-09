import type { Audience, LevelId } from '@/lib/types'
import { LEVELS } from '@/lib/constants'

export const ENGVO_REALTIME_MODEL = 'gpt-realtime-mini'
export const ENGVO_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'
export const ENGVO_DEFAULT_VOICE = 'alloy'
export const ENGVO_DEFAULT_LEVEL: Extract<LevelId, 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'> = 'a2'
export const ENGVO_VOICE_STORAGE_KEY = 'myeng-engvo-realtime-voice'
export const ENGVO_LEVEL_STORAGE_KEY = 'myeng-engvo-cefr-level'
export const ENGVO_SPEECH_SPEED_STORAGE_KEY = 'myeng-engvo-speech-speed-preset'

/** Служебное сообщение в чате после завершения звонка Engvo (без кнопок озвучки/перевода). */
export const ENGVO_CALL_FINISHED_ASSISTANT_TEXT = 'Call is finished'

/** Служебная строка при повторном соединении (как индикатор «Набираем Engvo…» в футере). */
export const ENGVO_DIALING_ASSISTANT_TEXT = 'Набираем Engvo…'

/** Диапазон `speed` в OpenAI Realtime session. */
export const ENGVO_REALTIME_SPEED_MIN = 0.25
export const ENGVO_REALTIME_SPEED_MAX = 1.5

export const ENGVO_SPEECH_SPEED_PRESETS = [
  { id: 'conversational', label: 'Разговорная', speed: 1.0 },
  { id: 'normal', label: 'Обычная', speed: 0.85 },
  { id: 'calm', label: 'Спокойная', speed: 0.7 },
] as const

export type EngvoSpeechSpeedPresetId = (typeof ENGVO_SPEECH_SPEED_PRESETS)[number]['id']

export const ENGVO_REALTIME_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const

export type EngvoRealtimeVoice = (typeof ENGVO_REALTIME_VOICES)[number]
export type EngvoCefrLevel = Extract<LevelId, 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'>

export const ENGVO_LEVEL_OPTIONS = LEVELS.filter((item): item is { id: EngvoCefrLevel; label: string } =>
  ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].includes(item.id)
)

export function isEngvoRealtimeVoice(value: string): value is EngvoRealtimeVoice {
  return (ENGVO_REALTIME_VOICES as readonly string[]).includes(value)
}

export function isEngvoCefrLevel(value: string): value is EngvoCefrLevel {
  return ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].includes(value)
}

export function isEngvoSpeechSpeedPreset(value: string): value is EngvoSpeechSpeedPresetId {
  return (ENGVO_SPEECH_SPEED_PRESETS as readonly { id: string }[]).some((p) => p.id === value)
}

export function clampEngvoRealtimeSpeed(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(ENGVO_REALTIME_SPEED_MAX, Math.max(ENGVO_REALTIME_SPEED_MIN, value))
}

export function engvoSpeechSpeedFromPreset(id: EngvoSpeechSpeedPresetId): number {
  const row = ENGVO_SPEECH_SPEED_PRESETS.find((p) => p.id === id)
  return row?.speed ?? 1.0
}

export function getEngvoDefaultSpeechSpeedPreset(audience: Audience): EngvoSpeechSpeedPresetId {
  return audience === 'child' ? 'normal' : 'conversational'
}
