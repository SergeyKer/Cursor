import type { PracticeEntrySource } from '@/types/practice'

/** Действие по нажатию основной кнопки карточки - обрабатывается колбэками из `page.tsx`. */
export type MyPlanAction =
  | { kind: 'resume_lesson'; lessonId: string }
  | { kind: 'open_lesson'; lessonId: string }
  | {
      kind: 'start_practice'
      lessonId: string
      mode: 'relaxed' | 'balanced'
      entrySource: PracticeEntrySource
    }
  | { kind: 'quick_practice'; entrySource: 'quick_start' }
  | { kind: 'weak_spot'; spotId: string; target: 'vocabulary' | 'practice' }

export interface MyPlanRecommendation {
  id: string
  priority: number
  title: string
  subtitle: string
  reasonLine: string
  action: MyPlanAction
  buttonLabel: string
  ariaLabel: string
}

export interface MyPlanCatalogTopic {
  id: string
  title: string
  order: number
  enabled: boolean
  hasTheory: boolean
  hasPractice: boolean
}

export interface MyPlanLessonProgressSlice {
  lessonId: string
  topic: string
  completedSteps: number[]
  lastCompleted: string
  mistakesCount: number
}

export interface MyPlanRewardsSlice {
  lastActiveDate: string | null
  dailyStreak: number
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
}
