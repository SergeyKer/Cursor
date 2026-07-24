import type { PostLessonAction } from '@/types/lesson'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'
import { migrateUserLessonProgress } from '@/lib/lessonProgressMigration'

/** Cloud allowlist v1 — no mistakes, no deprecated xp/combo. */
export type CloudLessonProgressV1 = {
  lessonId: string
  topic: string
  level: string
  completedSteps: number[]
  completedVariants: number[]
  coreXp: number
  comboXp: number
  totalXp: number
  maxCoreXp: number
  corePercent: number
  strengthPercent: number
  maxCombo: number
  bestCoreXp: number
  bestTotalXp: number
  medal: LessonMedalTierOrNull
  lessonCompleted?: boolean
  lessonBadgeEarned?: boolean
  lessonBadgeEarnedAt?: string
  lessonBadgeCriteriaMet?: string[]
  lastCompleted: string
  postLessonChoice?: PostLessonAction
  cycle1Started?: boolean
  cycle1Closed?: boolean
  lessonCycle?: number
}

export type LessonProgressSyncMeta = {
  clientUpdatedAt: string
  revision: number
}

export type LessonProgressRemoteRow = {
  lessonId: string
  schemaVersion: number
  payload: CloudLessonProgressV1
  clientUpdatedAt: string
  clientRevision: number
  serverUpdatedAt?: string
}

export type MergeSide = {
  progress: UserLessonProgress
  clientUpdatedAt: string
  revision: number
}

export const LESSON_PROGRESS_SCHEMA_VERSION = 1
export const LESSON_PROGRESS_MAX_PAYLOAD_BYTES = 102_400
export const LESSON_PROGRESS_HYDRATED_EVENT = 'myeng:lesson-progress-hydrated'

export function toCloudLessonProgressV1(progress: UserLessonProgress): CloudLessonProgressV1 {
  const migrated = migrateUserLessonProgress(progress, progress.lessonId)
  const cloud: CloudLessonProgressV1 = {
    lessonId: migrated.lessonId,
    topic: migrated.topic,
    level: migrated.level,
    completedSteps: migrated.completedSteps,
    completedVariants: migrated.completedVariants,
    coreXp: migrated.coreXp,
    comboXp: migrated.comboXp,
    totalXp: migrated.totalXp,
    maxCoreXp: migrated.maxCoreXp,
    corePercent: migrated.corePercent,
    strengthPercent: migrated.strengthPercent,
    maxCombo: migrated.maxCombo,
    bestCoreXp: migrated.bestCoreXp,
    bestTotalXp: migrated.bestTotalXp,
    medal: migrated.medal,
    lastCompleted: migrated.lastCompleted,
  }
  if (migrated.lessonCompleted === true) cloud.lessonCompleted = true
  if (migrated.lessonBadgeEarned === true) cloud.lessonBadgeEarned = true
  if (migrated.lessonBadgeEarnedAt) cloud.lessonBadgeEarnedAt = migrated.lessonBadgeEarnedAt
  if (migrated.lessonBadgeCriteriaMet?.length) {
    cloud.lessonBadgeCriteriaMet = migrated.lessonBadgeCriteriaMet
  }
  if (migrated.postLessonChoice) cloud.postLessonChoice = migrated.postLessonChoice
  if (migrated.cycle1Started === true) cloud.cycle1Started = true
  if (migrated.cycle1Closed === true) cloud.cycle1Closed = true
  if (typeof migrated.lessonCycle === 'number') cloud.lessonCycle = migrated.lessonCycle
  return cloud
}

export function fromCloudLessonProgressV1(
  cloud: CloudLessonProgressV1,
  existingLocal: UserLessonProgress | null
): UserLessonProgress {
  const mergedMistakes = existingLocal?.mistakes ?? []
  return migrateUserLessonProgress(
    {
      ...cloud,
      xp: cloud.totalXp,
      combo: cloud.maxCombo,
      mistakes: mergedMistakes,
    },
    cloud.lessonId
  )
}

export function estimateCloudPayloadBytes(cloud: CloudLessonProgressV1): number {
  return new TextEncoder().encode(JSON.stringify(cloud)).length
}

function parseTime(value: string): number {
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : Number.NaN
}

/**
 * local wins on equal/unknown. Prefer newer clientUpdatedAt, then revision.
 */
export function pickWinningLessonProgress(
  local: MergeSide,
  remote: MergeSide
): { winner: 'local' | 'remote'; side: MergeSide } {
  const localT = parseTime(local.clientUpdatedAt)
  const remoteT = parseTime(remote.clientUpdatedAt)
  if (Number.isFinite(localT) && Number.isFinite(remoteT)) {
    if (localT > remoteT) return { winner: 'local', side: local }
    if (remoteT > localT) return { winner: 'remote', side: remote }
  } else if (Number.isFinite(localT) && !Number.isFinite(remoteT)) {
    return { winner: 'local', side: local }
  } else if (!Number.isFinite(localT) && Number.isFinite(remoteT)) {
    return { winner: 'remote', side: remote }
  }

  if (local.revision > remote.revision) return { winner: 'local', side: local }
  if (remote.revision > local.revision) return { winner: 'remote', side: remote }
  return { winner: 'local', side: local }
}
