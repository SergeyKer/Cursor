import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'

export type LessonBadgeCriterionId = 'completed' | 'medal_silver_plus' | 'max_combo_7'

export interface LessonBadgeDefinition {
  lessonId: string
  badgeId: string
  emoji: string
  title: string
  tagline: string
  criteria: LessonBadgeCriterionId[]
}

export const LESSON_BADGE_DEFINITIONS: LessonBadgeDefinition[] = [
  {
    lessonId: '4',
    badgeId: 'first-meeting',
    emoji: '👋',
    title: 'Первое знакомство',
    tagline: 'Представился без ляпов и не сбился с ритма',
    criteria: ['completed', 'medal_silver_plus', 'max_combo_7'],
  },
  {
    lessonId: '1',
    badgeId: 'on-time',
    emoji: '⏰',
    title: 'Пунктуальный',
    tagline: 'Вовремя и без пауз в серии',
    criteria: ['completed', 'medal_silver_plus', 'max_combo_7'],
  },
  {
    lessonId: '2',
    badgeId: 'detective-who',
    emoji: '🕵️',
    title: 'Детектив Who',
    tagline: 'Раскрыл дело без сброса COMBO',
    criteria: ['completed', 'medal_silver_plus', 'max_combo_7'],
  },
  {
    lessonId: '3',
    badgeId: 'embedded-pro',
    emoji: '🧩',
    title: 'Встроенный профи',
    tagline: 'Вложенные фразы + серия ×7',
    criteria: ['completed', 'medal_silver_plus', 'max_combo_7'],
  },
]

const CRITERION_LABELS: Record<LessonBadgeCriterionId, string> = {
  completed: 'завершить урок',
  medal_silver_plus: 'медаль серебро или золото',
  max_combo_7: 'серия COMBO ×7',
}

export function getLessonBadgeDefinition(lessonId: string): LessonBadgeDefinition | null {
  return LESSON_BADGE_DEFINITIONS.find((item) => item.lessonId === lessonId) ?? null
}

export function isLessonCompleted(progress: Pick<UserLessonProgress, 'lessonCompleted' | 'completedSteps' | 'lastCompleted'>): boolean {
  if (progress.lessonCompleted) return true
  if (progress.completedSteps.length >= 7 && progress.lastCompleted) return true
  return false
}

function meetsCriterion(
  criterion: LessonBadgeCriterionId,
  progress: UserLessonProgress,
  medal: LessonMedalTierOrNull
): boolean {
  switch (criterion) {
    case 'completed':
      return isLessonCompleted(progress)
    case 'medal_silver_plus':
      return medal === 'silver' || medal === 'gold'
    case 'max_combo_7':
      return (progress.maxCombo ?? 0) >= 7
    default:
      return false
  }
}

export function resolveLessonBadgeProgress(
  progress: UserLessonProgress,
  definition: LessonBadgeDefinition,
  medal: LessonMedalTierOrNull
): {
  met: number
  total: number
  missingLabels: string[]
  earned: boolean
  criteriaMet: LessonBadgeCriterionId[]
} {
  const criteriaMet = definition.criteria.filter((criterion) => meetsCriterion(criterion, progress, medal))
  const missing = definition.criteria.filter((criterion) => !criteriaMet.includes(criterion))
  const earned = progress.lessonBadgeEarned === true || criteriaMet.length === definition.criteria.length

  return {
    met: criteriaMet.length,
    total: definition.criteria.length,
    missingLabels: missing.map((id) => CRITERION_LABELS[id]),
    earned,
    criteriaMet,
  }
}
