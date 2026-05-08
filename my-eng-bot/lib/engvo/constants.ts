import type { LevelId } from '@/lib/types'
import { LEVELS } from '@/lib/constants'

export const ENGVO_REALTIME_MODEL = 'gpt-realtime-mini'
export const ENGVO_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'
export const ENGVO_DEFAULT_VOICE = 'alloy'
export const ENGVO_DEFAULT_LEVEL: Extract<LevelId, 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'> = 'a2'
export const ENGVO_VOICE_STORAGE_KEY = 'myeng-engvo-realtime-voice'
export const ENGVO_LEVEL_STORAGE_KEY = 'myeng-engvo-cefr-level'

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
