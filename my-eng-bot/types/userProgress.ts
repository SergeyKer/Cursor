import type { PostLessonAction } from '@/types/lesson'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'

export interface UserLessonProgress {
  lessonId: string
  topic: string
  level: string
  completedSteps: number[]
  completedVariants: number[]
  /** @deprecated use coreXp — kept for migration */
  xp: number
  /** @deprecated use maxCombo — kept for migration */
  combo: number
  coreXp: number
  comboXp: number
  totalXp: number
  maxCoreXp: number
  corePercent: number
  strengthPercent: number
  maxCombo: number
  bestCoreXp: number
  /** Лучший coreXp + comboXp за завершённые проходы */
  bestTotalXp: number
  medal: LessonMedalTierOrNull
  lessonCompleted?: boolean
  lessonBadgeEarned?: boolean
  lessonBadgeEarnedAt?: string
  lessonBadgeCriteriaMet?: string[]
  mistakes: Array<{ step: number; userAnswer: string; correctAnswer: string }>
  lastCompleted: string
  postLessonChoice?: PostLessonAction
}
