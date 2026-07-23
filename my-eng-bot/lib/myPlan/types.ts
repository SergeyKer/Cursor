import type { PracticeEntrySource } from '@/types/practice'
import type { AttentionZone } from '@/lib/learningMemory/types'
import type { LessonCatalogLevel } from '@/lib/lessonCatalog'

/** Действие по нажатию основной кнопки карточки. */
export type MyPlanAction =
  | { kind: 'resume_lesson'; lessonId: string }
  | { kind: 'open_lesson'; lessonId: string }
  | {
      kind: 'start_practice'
      lessonId: string
      mode: 'relaxed' | 'balanced' | 'challenge'
      entrySource: PracticeEntrySource
    }
  | { kind: 'quick_practice'; entrySource: 'quick_start' | 'my_plan' }
  | { kind: 'weak_spot'; spotId: string; target: 'vocabulary' | 'practice' }
  | {
      kind: 'reinforce_skill'
      skillTagId: string
      lessonId?: string
      generation: 'local' | 'ai'
      entrySource: PracticeEntrySource
    }
  | { kind: 'open_reference'; lessonId: string }

export type NowGoalType =
  | 'incomplete'
  | 'reinforce'
  | 'practice_after_theory'
  | 'next_lesson'
  | 'soft_return'
  | 'weak_spot'

export interface MyPlanRecommendation {
  id: string
  priority: number
  title: string
  subtitle: string
  reasonLine: string
  action: MyPlanAction
  buttonLabel: string
  ariaLabel: string
  /** Оценка длительности для UI; null = не показывать. */
  timeLabel?: string | null
  goalType?: NowGoalType
}

export interface MyPlanCatalogTopic {
  id: string
  title: string
  order: number
  enabled: boolean
  hasTheory: boolean
  hasPractice: boolean
  level: LessonCatalogLevel
}

export type ProgramStatus =
  | 'active'
  | 'blocked_by_incomplete'
  | 'level_complete'
  | 'no_unstarted'
  | 'no_catalog'

export interface MyPlanLessonProgressSlice {
  lessonId: string
  topic: string
  completedSteps: number[]
  lastCompleted: string
  mistakesCount: number
  /** ISO; для incomplete — когда последний раз трогали (опционально). */
  incompleteTouchedAtIso?: string | null
}

export interface MyPlanRewardsSlice {
  lastActiveDate: string | null
  dailyStreak: number
  level?: number
  totalXP?: number
  modeGoals: {
    communication: { completed: boolean }
    engvo: { completed: boolean }
  }
}

export interface MyPlanPracticeSessionSlice {
  lessonId: string
  completedAt: number | null
  status: string
}

/** Вход чистой функции рекомендаций (без `window`). */
export interface MyPlanInput {
  todayDate: string
  catalog: MyPlanCatalogTopic[]
  lessons: Record<string, MyPlanLessonProgressSlice>
  rewards: MyPlanRewardsSlice
  practiceCompleted: MyPlanPracticeSessionSlice[]
  daysSinceLastActive: number | null
  weakSpots: Array<{ id: string; label: string }>
  /** CEFR якорь из settings.level (не XP). */
  anchorLevel: LessonCatalogLevel
  /** Зоны внимания (кормят ranking; UI debug отдельно). */
  attentionZones?: AttentionZone[]
  /** Аудитория для copy. */
  audience?: 'child' | 'adult'
  /** Можно ли AI reinforce (stub entitlement). */
  canUseAiReinforce?: boolean
  /** now override для тестов. */
  nowMs?: number
}

export interface MyPlanStatusSlice {
  dailyStreak: number
  level: number
  totalXP: number
}

export interface NowGoalResult {
  mainTask: MyPlanRecommendation | null
  secondary: MyPlanRecommendation[]
  status: MyPlanStatusSlice
  programTask: MyPlanRecommendation | null
  programStatus: ProgramStatus
  unstartedCount: number
}

/** Пороги v1 selectNowGoal. */
export const INCOMPLETE_STALE_DAYS = 7
export const CRITICAL_ZONE_ERROR_COUNT = 3
export const SOFT_RETURN_DAYS = 3
export const MAX_SECONDARY = 2
