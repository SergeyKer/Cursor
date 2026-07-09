import type { Audience, LevelId } from '@/lib/types'
import { LEVELS } from '@/lib/constants'
import { isEngvoCustomVoiceId } from '@/lib/engvo/voiceLab/customVoicesManifest'

export const ENGVO_REALTIME_MODEL = 'gpt-realtime-mini'
export const ENGVO_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'
export const ENGVO_DEFAULT_VOICE = 'marin'
export const ENGVO_DEFAULT_LEVEL: Extract<LevelId, 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'> = 'a2'
export const ENGVO_VOICE_STORAGE_KEY = 'myeng-engvo-realtime-voice'
export const ENGVO_XAI_VOICE_STORAGE_KEY = 'myeng-engvo-xai-voice'
export const ENGVO_PROVIDER_STORAGE_KEY = 'myeng-engvo-provider'
export const ENGVO_LEVEL_STORAGE_KEY = 'myeng-engvo-cefr-level'
export const ENGVO_SPEECH_SPEED_STORAGE_KEY = 'myeng-engvo-speech-speed-preset'
export const ENGVO_INACTIVITY_HANGUP_MS = 45_000
/** Hard cap on live call wall-clock (token burn guard). */
export const ENGVO_MAX_CALL_DURATION_MS = 5 * 60_000

export const ENGVO_PROVIDERS = ['openai', 'xai'] as const
export type EngvoProvider = (typeof ENGVO_PROVIDERS)[number]
export const ENGVO_DEFAULT_PROVIDER: EngvoProvider = 'openai'

export const ENGVO_XAI_MODEL = 'grok-voice-latest'
export const ENGVO_XAI_DEFAULT_VOICE = 'luna'
export const ENGVO_XAI_SPEED_MIN = 0.7
export const ENGVO_XAI_SPEED_MAX = 1.5
export const ENGVO_XAI_PCM_SAMPLE_RATE = 24_000
export const ENGVO_XAI_REALTIME_URL = 'wss://api.x.ai/v1/realtime'

/** Original five Grok voices (Classic). */
export const ENGVO_XAI_CLASSIC_VOICES = ['ara', 'eve', 'leo', 'rex', 'sal'] as const

/** 21 new flagship Grok voices (New). Verified via GET /v1/tts/voices. */
export const ENGVO_XAI_NEW_VOICES = [
  'altair',
  'atlas',
  'carina',
  'castor',
  'celeste',
  'cosmo',
  'helios',
  'helix',
  'iris',
  'kepler',
  'lumen',
  'luna',
  'lux',
  'naksh',
  'orion',
  'perseus',
  'rigel',
  'sirius',
  'ursa',
  'zagan',
  'zenith',
] as const

export const ENGVO_XAI_VOICES = [...ENGVO_XAI_CLASSIC_VOICES, ...ENGVO_XAI_NEW_VOICES] as const

export type EngvoXaiVoice = (typeof ENGVO_XAI_VOICES)[number]
/** Built-in Grok voice or custom voice_id from Voice Lab manifest. */
export type EngvoXaiCallVoice = EngvoXaiVoice | string
export type EngvoXaiVoiceSectionId = 'classic' | 'new' | 'other'

export const ENGVO_XAI_VOICE_SECTIONS = [
  { id: 'classic' as const, label: 'Classic', voices: ENGVO_XAI_CLASSIC_VOICES },
  { id: 'new' as const, label: 'New', voices: ENGVO_XAI_NEW_VOICES },
]

export const ENGVO_PROVIDER_OPTIONS = [
  { id: 'openai' as const, label: 'ChatGPT' },
  { id: 'xai' as const, label: 'Grok' },
]

/** Служебное сообщение в чате после завершения звонка Engvo (без кнопок озвучки/перевода). */
export const ENGVO_CALL_FINISHED_ASSISTANT_TEXT = 'Call is finished'

/** Служебная строка при повторном соединении (как индикатор «Набираем Engvo…» в футере). */
export const ENGVO_DIALING_ASSISTANT_TEXT = 'Набираем Engvo…'

/** Диапазон скорости речи Engvo (`audio.output.speed` + подсказка в instructions). */
export const ENGVO_REALTIME_SPEED_MIN = 0.25
export const ENGVO_REALTIME_SPEED_MAX = 1.5

export const ENGVO_SPEECH_SPEED_PRESETS = [
  { id: 'conversational', label: 'Разговорная', speed: 1.0 },
  { id: 'normal', label: 'Обычная', speed: 0.9 },
  { id: 'calm', label: 'Спокойная', speed: 0.8 },
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
export type EngvoCallVoice = EngvoRealtimeVoice | EngvoXaiCallVoice
export type EngvoCefrLevel = Extract<LevelId, 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'>

export const ENGVO_LEVEL_OPTIONS = LEVELS.filter((item): item is { id: EngvoCefrLevel; label: string } =>
  ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].includes(item.id)
)

export function isEngvoProvider(value: string): value is EngvoProvider {
  return (ENGVO_PROVIDERS as readonly string[]).includes(value)
}

export function isEngvoRealtimeVoice(value: string): value is EngvoRealtimeVoice {
  return (ENGVO_REALTIME_VOICES as readonly string[]).includes(value)
}

export function isEngvoXaiVoice(value: string): value is EngvoXaiVoice {
  return (ENGVO_XAI_VOICES as readonly string[]).includes(value)
}

/** Built-in Grok voice or custom id listed in Voice Lab manifest. */
export function isEngvoAllowedXaiVoice(value: string): value is EngvoXaiCallVoice {
  const id = value.trim()
  if (!id) return false
  return isEngvoXaiVoice(id) || isEngvoCustomVoiceId(id)
}

export function isEngvoVoiceForProvider(provider: EngvoProvider, value: string): boolean {
  return provider === 'xai' ? isEngvoAllowedXaiVoice(value) : isEngvoRealtimeVoice(value)
}

export function getEngvoDefaultVoice(provider: EngvoProvider): EngvoCallVoice {
  return provider === 'xai' ? ENGVO_XAI_DEFAULT_VOICE : ENGVO_DEFAULT_VOICE
}

export function getEngvoVoicesForProvider(provider: EngvoProvider): readonly string[] {
  return provider === 'xai' ? ENGVO_XAI_VOICES : ENGVO_REALTIME_VOICES
}

export function getEngvoXaiVoiceSection(voice: EngvoXaiCallVoice): EngvoXaiVoiceSectionId {
  if (isEngvoCustomVoiceId(voice)) return 'other'
  return (ENGVO_XAI_CLASSIC_VOICES as readonly string[]).includes(voice) ? 'classic' : 'new'
}

export function isEngvoCefrLevel(value: string): value is EngvoCefrLevel {
  return ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].includes(value)
}

export function isEngvoSpeechSpeedPreset(value: string): value is EngvoSpeechSpeedPresetId {
  return (ENGVO_SPEECH_SPEED_PRESETS as readonly { id: string }[]).some((p) => p.id === value)
}

export function clampEngvoRealtimeSpeed(value: number, provider: EngvoProvider = 'openai'): number {
  if (!Number.isFinite(value)) return 1
  const min = provider === 'xai' ? ENGVO_XAI_SPEED_MIN : ENGVO_REALTIME_SPEED_MIN
  const max = provider === 'xai' ? ENGVO_XAI_SPEED_MAX : ENGVO_REALTIME_SPEED_MAX
  return Math.min(max, Math.max(min, value))
}

/** OpenAI: response.cancel + output_audio_buffer.clear; xAI: cancel only + local PCM clear. */
export function shouldSendOutputAudioBufferClear(provider: EngvoProvider): boolean {
  return provider === 'openai'
}

export function engvoSpeechSpeedFromPreset(id: EngvoSpeechSpeedPresetId): number {
  const row = ENGVO_SPEECH_SPEED_PRESETS.find((p) => p.id === id)
  return row?.speed ?? 1.0
}

export function getEngvoDefaultSpeechSpeedPreset(
  audience: Audience,
  level: EngvoCefrLevel
): EngvoSpeechSpeedPresetId {
  if (level === 'a1') return 'calm'
  return audience === 'child' ? 'normal' : 'conversational'
}

export function getEngvoDefaultCefrLevel(audience: Audience): EngvoCefrLevel {
  return audience === 'child' ? 'a1' : 'a2'
}

export function buildEngvoInputAudioTranscriptionConfig(): {
  model: typeof ENGVO_TRANSCRIPTION_MODEL
} {
  return {
    model: ENGVO_TRANSCRIPTION_MODEL,
  }
}

/** Порог активации server VAD (0–1): выше - меньше ложных срабатываний на кашель/шум. */
export const ENGVO_VAD_THRESHOLD = 0.72

/** xAI PCM без WebRTC AEC: чуть выше порог против TV/улицы (silence не удлиняем). */
export const ENGVO_XAI_VAD_THRESHOLD = 0.78

/** Тишина (мс) перед концом реплики пользователя. */
export const ENGVO_VAD_SILENCE_DURATION_MS = 900

/** Окно склейки почти одинаковых user-реплик на xAI (мс). */
export const ENGVO_XAI_USER_COALESCE_WINDOW_MS = 2_500

/** Force commit после speech_stopped, если server VAD завис в шуме (мс). */
export const ENGVO_XAI_FORCE_COMMIT_AFTER_SPEECH_STOPPED_MS = 2_000

/** Force commit max utterance после speech_started (мс). */
export const ENGVO_XAI_FORCE_COMMIT_MAX_UTTERANCE_MS = 7_000

/** Задержка перед response.cancel при перебивании озвучки Engvo (мс). */
export const ENGVO_INTERRUPT_DEBOUNCE_MS = 400

/** Server VAD для Engvo Realtime; прерывание ответа только на клиенте (избегаем гонки с авто-interrupt сервера). */
export const ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION = {
  type: 'server_vad' as const,
  threshold: ENGVO_VAD_THRESHOLD,
  prefix_padding_ms: 300,
  silence_duration_ms: ENGVO_VAD_SILENCE_DURATION_MS,
  create_response: true,
  interrupt_response: false,
}

/** Server VAD для xAI Voice Agent (шумнее mic path). */
export const ENGVO_XAI_SERVER_VAD_TURN_DETECTION = {
  type: 'server_vad' as const,
  threshold: ENGVO_XAI_VAD_THRESHOLD,
  prefix_padding_ms: 300,
  silence_duration_ms: ENGVO_VAD_SILENCE_DURATION_MS,
  create_response: true,
  interrupt_response: false,
}
