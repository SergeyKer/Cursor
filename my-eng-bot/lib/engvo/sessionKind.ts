import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import type { Audience, SentenceType, TenseId, TopicId } from '@/lib/types'
import { CHILD_TENSES } from '@/lib/constants'

export const ENGVO_SESSION_KIND_STORAGE_KEY = 'myeng-engvo-session-kind'
export const ENGVO_TEACHER_TENSE_STORAGE_KEY = 'myeng-engvo-teacher-tense'
export const ENGVO_TEACHER_SENTENCE_TYPE_STORAGE_KEY = 'myeng-engvo-teacher-sentence-type'

export const ENGVO_VOICE_SESSION_KINDS = ['free_call', 'teacher'] as const
export type EngvoVoiceSessionKind = (typeof ENGVO_VOICE_SESSION_KINDS)[number]

export type EngvoTeacherPhase = 'topic_choice' | 'drill'

export const ENGVO_DEFAULT_SESSION_KIND: EngvoVoiceSessionKind = 'free_call'
export const ENGVO_DEFAULT_TEACHER_TENSE: TenseId = 'present_simple'
export const ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE: SentenceType = 'general'

export const ENGVO_SESSION_KIND_OPTIONS: { id: EngvoVoiceSessionKind; label: string }[] = [
  { id: 'free_call', label: 'Свободный звонок' },
  { id: 'teacher', label: 'Преподаватель' },
]

export type EngvoTeacherDrillParams = {
  tense: TenseId
  sentenceType: SentenceType
  level: EngvoCefrLevel
  audience: Audience
  /** Future lesson entry: skip "what do you want to talk about?" */
  skipTopicChoice?: boolean
  /** Free-text or TopicId string when skipTopicChoice */
  topicPreset?: string | TopicId | null
}

export function isEngvoVoiceSessionKind(value: string): value is EngvoVoiceSessionKind {
  return (ENGVO_VOICE_SESSION_KINDS as readonly string[]).includes(value)
}

export function isEngvoTeacherTense(value: string): value is TenseId {
  return (
    value !== 'all' &&
    [
      'present_simple',
      'present_continuous',
      'present_perfect',
      'present_perfect_continuous',
      'past_simple',
      'past_continuous',
      'past_perfect',
      'past_perfect_continuous',
      'future_simple',
      'future_continuous',
      'future_perfect',
      'future_perfect_continuous',
    ].includes(value)
  )
}

export function isEngvoTeacherSentenceType(value: string): value is SentenceType {
  return ['general', 'interrogative', 'negative', 'mixed'].includes(value)
}

export function sanitizeEngvoTeacherTenseForAudience(
  tense: TenseId,
  audience: Audience
): TenseId {
  if (audience !== 'child') {
    return isEngvoTeacherTense(tense) ? tense : ENGVO_DEFAULT_TEACHER_TENSE
  }
  if ((CHILD_TENSES as readonly string[]).includes(tense)) return tense
  return ENGVO_DEFAULT_TEACHER_TENSE
}

export function resolveEngvoTeacherPhase(params: {
  kind: EngvoVoiceSessionKind
  skipTopicChoice?: boolean
}): EngvoTeacherPhase | null {
  if (params.kind !== 'teacher') return null
  return params.skipTopicChoice ? 'drill' : 'topic_choice'
}
