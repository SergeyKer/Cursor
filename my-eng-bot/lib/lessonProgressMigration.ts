import {
  computeCorePercent,
  computeStrengthPercent,
  MAX_CORE_XP_DEFAULT,
  resolveMedalFromCoreXp,
  upgradeMedal,
} from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'

export function migrateUserLessonProgress(
  row: Partial<UserLessonProgress>,
  lessonId: string
): UserLessonProgress {
  const completedSteps = Array.isArray(row.completedSteps) ? row.completedSteps.filter((v) => typeof v === 'number') : []
  const completedVariants = Array.isArray(row.completedVariants)
    ? row.completedVariants.filter((v) => typeof v === 'number')
    : []
  const legacyXp = typeof row.xp === 'number' ? row.xp : 0
  const legacyCombo = typeof row.combo === 'number' ? row.combo : 0

  const coreXp = typeof row.coreXp === 'number' ? row.coreXp : legacyXp
  const comboXp = typeof row.comboXp === 'number' ? row.comboXp : 0
  const maxCoreXp = typeof row.maxCoreXp === 'number' && row.maxCoreXp > 0 ? row.maxCoreXp : MAX_CORE_XP_DEFAULT
  const totalXp = typeof row.totalXp === 'number' ? row.totalXp : coreXp + comboXp
  const maxCombo = typeof row.maxCombo === 'number' ? Math.max(row.maxCombo, legacyCombo) : legacyCombo
  const bestCoreXp = typeof row.bestCoreXp === 'number' ? row.bestCoreXp : coreXp
  const lessonCompleted =
    row.lessonCompleted === true ||
    (completedSteps.length >= 7 && typeof row.lastCompleted === 'string' && row.lastCompleted.length > 0)

  const corePercent = typeof row.corePercent === 'number' ? row.corePercent : computeCorePercent(coreXp, maxCoreXp)
  const strengthPercent =
    typeof row.strengthPercent === 'number' ? row.strengthPercent : computeStrengthPercent(totalXp, maxCoreXp)

  let medal = row.medal ?? null
  if (lessonCompleted && !medal) {
    medal = resolveMedalFromCoreXp(coreXp, true, maxCoreXp)
  }

  return {
    lessonId,
    topic: typeof row.topic === 'string' ? row.topic : '',
    level: typeof row.level === 'string' ? row.level : '',
    completedSteps,
    completedVariants,
    xp: totalXp,
    combo: maxCombo,
    coreXp,
    comboXp,
    totalXp,
    maxCoreXp,
    corePercent,
    strengthPercent,
    maxCombo,
    bestCoreXp,
    medal,
    lessonCompleted,
    lessonBadgeEarned: row.lessonBadgeEarned === true,
    lessonBadgeEarnedAt: typeof row.lessonBadgeEarnedAt === 'string' ? row.lessonBadgeEarnedAt : undefined,
    lessonBadgeCriteriaMet: Array.isArray(row.lessonBadgeCriteriaMet)
      ? row.lessonBadgeCriteriaMet.filter((item): item is string => typeof item === 'string')
      : undefined,
    mistakes: Array.isArray(row.mistakes)
      ? row.mistakes.filter(
          (item): item is UserLessonProgress['mistakes'][number] =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as { step?: unknown }).step === 'number' &&
            typeof (item as { userAnswer?: unknown }).userAnswer === 'string' &&
            typeof (item as { correctAnswer?: unknown }).correctAnswer === 'string'
        )
      : [],
    lastCompleted: typeof row.lastCompleted === 'string' ? row.lastCompleted : '',
    ...(typeof row.postLessonChoice === 'string' ? { postLessonChoice: row.postLessonChoice } : {}),
  }
}

export function mergeLessonProgressOnComplete(
  previous: UserLessonProgress | null,
  session: {
    lessonId: string
    topic: string
    level: string
    completedSteps: number[]
    completedVariants: number[]
    coreXp: number
    comboXp: number
    maxCoreXp: number
    maxCombo: number
    mistakes: UserLessonProgress['mistakes']
    postLessonChoice?: UserLessonProgress['postLessonChoice']
  }
): UserLessonProgress {
  const totalXp = session.coreXp + session.comboXp
  const corePercent = computeCorePercent(session.coreXp, session.maxCoreXp)
  const strengthPercent = computeStrengthPercent(totalXp, session.maxCoreXp)
  const medal = resolveMedalFromCoreXp(session.coreXp, true, session.maxCoreXp)
  const bestCoreXp = Math.max(previous?.bestCoreXp ?? 0, session.coreXp)
  const mergedMedal = upgradeMedal(previous?.medal ?? null, medal)
  const mergedMaxCombo = Math.max(previous?.maxCombo ?? 0, session.maxCombo)

  return migrateUserLessonProgress(
    {
      ...session,
      lessonId: session.lessonId,
      topic: session.topic,
      level: session.level,
      completedSteps: session.completedSteps,
      completedVariants: session.completedVariants,
      coreXp: session.coreXp,
      comboXp: session.comboXp,
      totalXp,
      maxCoreXp: session.maxCoreXp,
      corePercent,
      strengthPercent,
      maxCombo: mergedMaxCombo,
      bestCoreXp,
      medal: mergedMedal,
      lessonCompleted: true,
      lastCompleted: new Date().toISOString(),
      mistakes: session.mistakes,
      postLessonChoice: session.postLessonChoice,
      lessonBadgeEarned: previous?.lessonBadgeEarned,
      lessonBadgeEarnedAt: previous?.lessonBadgeEarnedAt,
      lessonBadgeCriteriaMet: previous?.lessonBadgeCriteriaMet,
    },
    session.lessonId
  )
}
