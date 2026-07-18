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
  ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE,
  ENGVO_DEFAULT_TEACHER_TENSE,
  isEngvoTeacherSentenceType,
  isEngvoTeacherTense,
  isEngvoVoiceSessionKind,
  type EngvoVoiceSessionKind,
} from '@/lib/engvo/sessionKind'

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
  const tense: TenseId = isEngvoTeacherTense(raw.tense ?? '')
    ? (raw.tense as TenseId)
    : ENGVO_DEFAULT_TEACHER_TENSE
  const sentenceType: SentenceType = isEngvoTeacherSentenceType(raw.sentenceType ?? '')
    ? (raw.sentenceType as SentenceType)
    : ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE
  const skipTopicChoice =
    raw.skipTopicChoice === true || raw.skipTopicChoice === '1' || raw.skipTopicChoice === 'true'
  const topicPreset =
    typeof raw.topicPreset === 'string' && raw.topicPreset.trim() ? raw.topicPreset.trim() : null

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
  }
}
