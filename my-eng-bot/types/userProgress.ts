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
  /** Был хотя бы один отправленный ответ в рамках цикла 1 */
  cycle1Started?: boolean
  /** Цикл 1 закрыт без золотого финиша — локальный повтор только до серебра */
  cycle1Closed?: boolean
  /** 1 = первый проход к золоту, 2 = после броска цикла 1 */
  lessonCycle?: number
}
