import type {
  EngvoCefrLevel,
  EngvoProvider,
  EngvoRealtimeVoice,
  EngvoXaiCallVoice,
} from '@/lib/engvo/constants'
import type { EngvoTeacherDrillKind, EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'
import type { Audience, SentenceType, TenseId, TopicId } from '@/lib/types'

export type EngvoSessionBootstrapSnapshot = {
  level: EngvoCefrLevel
  audience: Audience
  topic: TopicId
  voice: EngvoRealtimeVoice | EngvoXaiCallVoice
  speed: number
  provider: EngvoProvider
  kind: EngvoVoiceSessionKind
  teacherTense?: TenseId
  teacherSentenceType?: SentenceType
  teacherDrillKind?: EngvoTeacherDrillKind
  teacherLessonId?: string | null
  teacherEffectiveLessonId?: string | null
}

export function buildEngvoSessionBootstrapSnapshot(
  params: EngvoSessionBootstrapSnapshot
): EngvoSessionBootstrapSnapshot {
  return { ...params }
}

export function areEngvoSessionBootstrapSnapshotsEqual(
  a: EngvoSessionBootstrapSnapshot | null | undefined,
  b: EngvoSessionBootstrapSnapshot | null | undefined
): boolean {
  if (!a || !b) return false
  return (
    a.level === b.level &&
    a.audience === b.audience &&
    a.topic === b.topic &&
    a.voice === b.voice &&
    a.speed === b.speed &&
    a.provider === b.provider &&
    a.kind === b.kind &&
    (a.teacherTense ?? null) === (b.teacherTense ?? null) &&
    (a.teacherSentenceType ?? null) === (b.teacherSentenceType ?? null) &&
    (a.teacherDrillKind ?? null) === (b.teacherDrillKind ?? null) &&
    (a.teacherLessonId ?? null) === (b.teacherLessonId ?? null) &&
    (a.teacherEffectiveLessonId ?? null) === (b.teacherEffectiveLessonId ?? null)
  )
}

/** True when effect would send the same session params already applied at bootstrap/last ack. */
export function isEngvoSessionBootstrapRedundantUpdate(
  bootstrap: EngvoSessionBootstrapSnapshot | null | undefined,
  next: EngvoSessionBootstrapSnapshot
): boolean {
  if (!bootstrap) return false
  return areEngvoSessionBootstrapSnapshotsEqual(bootstrap, next)
}
