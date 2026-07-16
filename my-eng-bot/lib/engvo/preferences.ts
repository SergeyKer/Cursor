import {
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_PROVIDER,
  ENGVO_DEFAULT_VOICE,
  ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE,
  ENGVO_LEVEL_STORAGE_KEY,
  ENGVO_PROVIDER_STORAGE_KEY,
  ENGVO_SPEECH_SPEED_STORAGE_KEY,
  ENGVO_VOICE_STORAGE_KEY,
  ENGVO_XAI_DEFAULT_VOICE,
  ENGVO_XAI_VOICE_ROTATION_MODE_STORAGE_KEY,
  ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY,
  ENGVO_XAI_VOICE_STORAGE_KEY,
  getEngvoDefaultCefrLevel,
  getEngvoDefaultSpeechSpeedPreset,
  getEngvoDefaultVoice,
  isEngvoCefrLevel,
  isEngvoProvider,
  isEngvoRealtimeVoice,
  isEngvoAllowedXaiVoice,
  isEngvoSpeechSpeedPreset,
  isEngvoXaiVoiceRotationMode,
  type EngvoCefrLevel,
  type EngvoProvider,
  type EngvoRealtimeVoice,
  type EngvoSpeechSpeedPresetId,
  type EngvoXaiCallVoice,
  type EngvoXaiVoice,
  type EngvoXaiVoiceRotationMode,
} from '@/lib/engvo/constants'
import {
  ENGVO_DEFAULT_SESSION_KIND,
  ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE,
  ENGVO_DEFAULT_TEACHER_TENSE,
  ENGVO_SESSION_KIND_STORAGE_KEY,
  ENGVO_TEACHER_SENTENCE_TYPE_STORAGE_KEY,
  ENGVO_TEACHER_TENSE_STORAGE_KEY,
  isEngvoTeacherSentenceType,
  isEngvoTeacherTense,
  isEngvoVoiceSessionKind,
  sanitizeEngvoTeacherTenseForAudience,
  type EngvoVoiceSessionKind,
} from '@/lib/engvo/sessionKind'
import { sanitizeXaiVoiceShuffleRemaining } from '@/lib/engvo/xaiVoiceRotation'
import type { Audience, SentenceType, TenseId } from '@/lib/types'

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

export function loadEngvoXaiVoice(): EngvoXaiCallVoice {
  if (typeof window === 'undefined') return ENGVO_XAI_DEFAULT_VOICE
  try {
    const raw = localStorage.getItem(ENGVO_XAI_VOICE_STORAGE_KEY)?.trim() ?? ''
    return isEngvoAllowedXaiVoice(raw) ? raw : ENGVO_XAI_DEFAULT_VOICE
  } catch {
    return ENGVO_XAI_DEFAULT_VOICE
  }
}

export function saveEngvoXaiVoice(value: EngvoXaiCallVoice): void {
  if (typeof window === 'undefined') return
  if (!isEngvoAllowedXaiVoice(value)) return
  try {
    localStorage.setItem(ENGVO_XAI_VOICE_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoXaiVoiceRotationMode(): EngvoXaiVoiceRotationMode {
  if (typeof window === 'undefined') return ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE
  try {
    const raw = localStorage.getItem(ENGVO_XAI_VOICE_ROTATION_MODE_STORAGE_KEY)?.trim() ?? ''
    return isEngvoXaiVoiceRotationMode(raw) ? raw : ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE
  } catch {
    return ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE
  }
}

export function saveEngvoXaiVoiceRotationMode(value: EngvoXaiVoiceRotationMode): void {
  if (typeof window === 'undefined') return
  if (!isEngvoXaiVoiceRotationMode(value)) return
  try {
    localStorage.setItem(ENGVO_XAI_VOICE_ROTATION_MODE_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoXaiVoiceShuffleRemaining(): EngvoXaiVoice[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return sanitizeXaiVoiceShuffleRemaining(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return []
  }
}

export function saveEngvoXaiVoiceShuffleRemaining(value: readonly EngvoXaiVoice[]): void {
  if (typeof window === 'undefined') return
  try {
    const clean = sanitizeXaiVoiceShuffleRemaining(value)
    if (clean.length === 0) {
      localStorage.removeItem(ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY)
      return
    }
    localStorage.setItem(ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY, JSON.stringify(clean))
  } catch {
    // ignore
  }
}

export function clearEngvoXaiVoiceShuffleRemaining(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function loadEngvoVoiceForProvider(provider: EngvoProvider): EngvoRealtimeVoice | EngvoXaiCallVoice {
  return provider === 'xai' ? loadEngvoXaiVoice() : loadEngvoRealtimeVoice()
}

export function saveEngvoVoiceForProvider(
  provider: EngvoProvider,
  value: string
): void {
  if (provider === 'xai') {
    if (isEngvoAllowedXaiVoice(value)) saveEngvoXaiVoice(value)
    return
  }
  if (isEngvoRealtimeVoice(value)) saveEngvoRealtimeVoice(value)
}

/** When switching provider, keep each roster's last voice; return voice for the new provider. */
export function resolveVoiceAfterProviderChange(provider: EngvoProvider): EngvoRealtimeVoice | EngvoXaiCallVoice {
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

export function loadEngvoSessionKind(): EngvoVoiceSessionKind {
  if (typeof window === 'undefined') return ENGVO_DEFAULT_SESSION_KIND
  try {
    const raw = localStorage.getItem(ENGVO_SESSION_KIND_STORAGE_KEY)?.trim() ?? ''
    return isEngvoVoiceSessionKind(raw) ? raw : ENGVO_DEFAULT_SESSION_KIND
  } catch {
    return ENGVO_DEFAULT_SESSION_KIND
  }
}

export function saveEngvoSessionKind(value: EngvoVoiceSessionKind): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ENGVO_SESSION_KIND_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoTeacherTense(audience?: Audience): TenseId {
  const fallback = ENGVO_DEFAULT_TEACHER_TENSE
  if (typeof window === 'undefined') {
    return audience ? sanitizeEngvoTeacherTenseForAudience(fallback, audience) : fallback
  }
  try {
    const raw = localStorage.getItem(ENGVO_TEACHER_TENSE_STORAGE_KEY)?.trim() ?? ''
    const tense = isEngvoTeacherTense(raw) ? raw : fallback
    return audience ? sanitizeEngvoTeacherTenseForAudience(tense, audience) : tense
  } catch {
    return audience ? sanitizeEngvoTeacherTenseForAudience(fallback, audience) : fallback
  }
}

export function saveEngvoTeacherTense(value: TenseId): void {
  if (typeof window === 'undefined') return
  if (!isEngvoTeacherTense(value)) return
  try {
    localStorage.setItem(ENGVO_TEACHER_TENSE_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export function loadEngvoTeacherSentenceType(): SentenceType {
  if (typeof window === 'undefined') return ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE
  try {
    const raw = localStorage.getItem(ENGVO_TEACHER_SENTENCE_TYPE_STORAGE_KEY)?.trim() ?? ''
    return isEngvoTeacherSentenceType(raw) ? raw : ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE
  } catch {
    return ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE
  }
}

export function saveEngvoTeacherSentenceType(value: SentenceType): void {
  if (typeof window === 'undefined') return
  if (!isEngvoTeacherSentenceType(value)) return
  try {
    localStorage.setItem(ENGVO_TEACHER_SENTENCE_TYPE_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}
