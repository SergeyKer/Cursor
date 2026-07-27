import type { Audience, SentenceType, TenseId, TopicId } from '@/lib/types'
import { TOPICS } from '@/lib/constants'
import {
  clampEngvoRealtimeSpeed,
  ENGVO_DEFAULT_LEVEL,
  isEngvoCefrLevel,
  type EngvoCefrLevel,
  type EngvoProvider,
} from '@/lib/engvo/constants'
import {
  ENGVO_DEFAULT_TEACHER_DRILL_KIND,
  ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE,
  ENGVO_DEFAULT_TEACHER_TENSE,
  isEngvoTeacherDrillKind,
  isEngvoTeacherSentenceType,
  isEngvoTeacherTense,
  isEngvoTeacherConcreteTense,
  isEngvoVoiceSessionKind,
  normalizeEngvoTeacherLessonId,
  type EngvoTeacherDrillKind,
  type EngvoTeacherDrillParams,
  type EngvoVoiceSessionKind,
} from '@/lib/engvo/sessionKind'
import {
  resolveTeacherLessonAxis,
  toTeacherLessonAxisPrompt,
} from '@/lib/engvo/teacherLessonAxis'

export type EngvoRealtimeInstructionParams = {
  audience: Audience
  level: EngvoCefrLevel
  topic: TopicId
  speechSpeed: number
  kind: EngvoVoiceSessionKind
  tense: TenseId
  sentenceType: SentenceType
  skipTopicChoice: boolean
  topicPreset: string | null
  teacherDrillKind: EngvoTeacherDrillKind
  teacherLessonId: string | null
  teacherEffectiveLessonId: string | null
  lessonAxis: EngvoTeacherDrillParams['lessonAxis']
  nextTense?: TenseId | null
}

export function resolveEngvoRealtimeInstructionParams(
  raw: {
    audience?: string
    level?: string
    topic?: string
    speed?: unknown
    kind?: string
    tense?: string
    sentenceType?: string
    skipTopicChoice?: boolean | string
    topicPreset?: string | null
    teacherDrillKind?: string
    drillKind?: string
    teacherLessonId?: string | null
    lessonId?: string | null
    teacherEffectiveLessonId?: string | null
    effectiveLessonId?: string | null
    sessionSeed?: string | null
    teacherCurrentTense?: string | null
    teacherNextTense?: string | null
  },
  provider: EngvoProvider = 'openai'
): EngvoRealtimeInstructionParams {
  const audience: Audience = raw.audience === 'child' ? 'child' : 'adult'
  const level = isEngvoCefrLevel(raw.level ?? '') ? (raw.level as EngvoCefrLevel) : ENGVO_DEFAULT_LEVEL
  const topicIds = new Set<TopicId>(TOPICS.map((item) => item.id))
  const topic = topicIds.has(raw.topic as TopicId) ? (raw.topic as TopicId) : 'free_talk'
  const speechSpeed =
    typeof raw.speed === 'number' && Number.isFinite(raw.speed)
      ? clampEngvoRealtimeSpeed(raw.speed, provider)
      : typeof raw.speed === 'string' && raw.speed.trim() && Number.isFinite(Number(raw.speed))
        ? clampEngvoRealtimeSpeed(Number(raw.speed), provider)
        : 1
  const kind: EngvoVoiceSessionKind = isEngvoVoiceSessionKind(raw.kind ?? '')
    ? (raw.kind as EngvoVoiceSessionKind)
    : 'free_call'
  let tensePreference: TenseId = isEngvoTeacherTense(raw.tense ?? '')
    ? (raw.tense as TenseId)
    : ENGVO_DEFAULT_TEACHER_TENSE
  // Wire must never keep meta `all`; live rotation (phase 5) sends concrete. Fallback = default.
  let tense: TenseId =
    tensePreference === 'all' ? ENGVO_DEFAULT_TEACHER_TENSE : tensePreference
  if (!isEngvoTeacherConcreteTense(tense)) {
    tense = ENGVO_DEFAULT_TEACHER_TENSE
  }
  const sentenceType: SentenceType = isEngvoTeacherSentenceType(raw.sentenceType ?? '')
    ? (raw.sentenceType as SentenceType)
    : ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE
  const skipTopicChoice =
    raw.skipTopicChoice === true || raw.skipTopicChoice === '1' || raw.skipTopicChoice === 'true'
  const topicPreset =
    typeof raw.topicPreset === 'string' && raw.topicPreset.trim() ? raw.topicPreset.trim() : null

  const teacherDrillKind: EngvoTeacherDrillKind = isEngvoTeacherDrillKind(
    raw.teacherDrillKind ?? raw.drillKind ?? ''
  )
    ? ((raw.teacherDrillKind ?? raw.drillKind) as EngvoTeacherDrillKind)
    : ENGVO_DEFAULT_TEACHER_DRILL_KIND
  const teacherLessonId = normalizeEngvoTeacherLessonId(
    raw.teacherLessonId ?? raw.lessonId ?? null
  )
  const pinnedEffective = normalizeEngvoTeacherLessonId(
    raw.teacherEffectiveLessonId ?? raw.effectiveLessonId ?? null
  )
  const sessionSeed =
    typeof raw.sessionSeed === 'string' && raw.sessionSeed.trim()
      ? raw.sessionSeed.trim()
      : 'engvo-relay'

  const axis = resolveTeacherLessonAxis({
    sessionKind: kind,
    drillKind: teacherDrillKind,
    lessonId: teacherLessonId,
    level,
    sessionSeed,
    // Validate only — never re-roll 'all' on server if client already pinned.
    pinnedEffectiveLessonId: pinnedEffective,
  })

  let teacherEffectiveLessonId: string | null = null
  let lessonAxis: EngvoTeacherDrillParams['lessonAxis'] = null
  if (axis.active) {
    teacherEffectiveLessonId = axis.effectiveLessonId
    lessonAxis = toTeacherLessonAxisPrompt(axis)
    tense = axis.inferredTense
  } else if (isEngvoTeacherConcreteTense(raw.teacherCurrentTense ?? '')) {
    tense = raw.teacherCurrentTense as TenseId
  }

  const nextTense =
    !axis.active && isEngvoTeacherConcreteTense(raw.teacherNextTense ?? '')
      ? (raw.teacherNextTense as TenseId)
      : null

  return {
    audience,
    level,
    topic,
    speechSpeed,
    kind,
    tense,
    sentenceType,
    skipTopicChoice,
    topicPreset,
    teacherDrillKind,
    teacherLessonId,
    teacherEffectiveLessonId,
    lessonAxis,
    nextTense,
  }
}
