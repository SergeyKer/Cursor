import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import type { Audience, SentenceType, TenseId, TopicId, TranslationDrillKind } from '@/lib/types'
import { CHILD_TENSES } from '@/lib/constants'

export const ENGVO_SESSION_KIND_STORAGE_KEY = 'myeng-engvo-session-kind'
export const ENGVO_TEACHER_TENSE_STORAGE_KEY = 'myeng-engvo-teacher-tense'
export const ENGVO_TEACHER_SENTENCE_TYPE_STORAGE_KEY = 'myeng-engvo-teacher-sentence-type'
export const ENGVO_TEACHER_DRILL_KIND_STORAGE_KEY = 'myeng-engvo-teacher-drill-kind'
export const ENGVO_TEACHER_LESSON_ID_STORAGE_KEY = 'myeng-engvo-teacher-lesson-id'

export const ENGVO_VOICE_SESSION_KINDS = ['free_call', 'teacher'] as const
export type EngvoVoiceSessionKind = (typeof ENGVO_VOICE_SESSION_KINDS)[number]

/** Same axis contract as translation chat; storage is engvo-local. */
export type EngvoTeacherDrillKind = TranslationDrillKind

export type EngvoTeacherPhase = 'topic_choice' | 'drill'

export const ENGVO_DEFAULT_SESSION_KIND: EngvoVoiceSessionKind = 'free_call'
export const ENGVO_DEFAULT_TEACHER_TENSE: TenseId = 'present_simple'
export const ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE: SentenceType = 'general'
export const ENGVO_DEFAULT_TEACHER_DRILL_KIND: EngvoTeacherDrillKind = 'tense_drill'
export const ENGVO_DEFAULT_TEACHER_LESSON_ID = 'all'

export const ENGVO_SESSION_KIND_OPTIONS: { id: EngvoVoiceSessionKind; label: string }[] = [
  { id: 'free_call', label: 'Свободный звонок' },
  { id: 'teacher', label: 'Преподаватель' },
]

export type EngvoTeacherLessonAxisPrompt = {
  effectiveLessonId: string
  title: string
  grammarFocusLines: string[]
  /** Structure examples for RU drills / reclaim — not a new topic. */
  ruSeedOrientations: string[]
}

export type EngvoTeacherDrillParams = {
  tense: TenseId
  sentenceType: SentenceType
  level: EngvoCefrLevel
  audience: Audience
  /** Future lesson entry: skip "what do you want to talk about?" */
  skipTopicChoice?: boolean
  /** Free-text or TopicId string when skipTopicChoice */
  topicPreset?: string | TopicId | null
  /** When set, Required lesson grammar is the primary drill axis (not Required tense). */
  lessonAxis?: EngvoTeacherLessonAxisPrompt | null
  /** When preference is `all`, next SUCCESS drill tense (dual axis). */
  nextTense?: TenseId | null
}

export function isEngvoVoiceSessionKind(value: string): value is EngvoVoiceSessionKind {
  return (ENGVO_VOICE_SESSION_KINDS as readonly string[]).includes(value)
}

export function isEngvoTeacherConcreteTense(value: string): value is TenseId {
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

/** Preference id: concrete tense or meta `all` («Любое»). */
export function isEngvoTeacherTense(value: string): value is TenseId {
  return value === 'all' || isEngvoTeacherConcreteTense(value)
}

export function isEngvoTeacherSentenceType(value: string): value is SentenceType {
  return ['general', 'interrogative', 'negative', 'mixed'].includes(value)
}

export function isEngvoTeacherDrillKind(value: string): value is EngvoTeacherDrillKind {
  return value === 'tense_drill' || value === 'lesson_topic'
}

export function normalizeEngvoTeacherDrillKind(value: unknown): EngvoTeacherDrillKind {
  return value === 'lesson_topic' ? 'lesson_topic' : ENGVO_DEFAULT_TEACHER_DRILL_KIND
}

/** Persistable lesson id: `'all'`, concrete id, or null (not selected). */
export function normalizeEngvoTeacherLessonId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed
}

export function sanitizeEngvoTeacherTenseForAudience(
  tense: TenseId,
  audience: Audience
): TenseId {
  if (tense === 'all') return 'all'
  if (audience !== 'child') {
    return isEngvoTeacherConcreteTense(tense) ? tense : ENGVO_DEFAULT_TEACHER_TENSE
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
