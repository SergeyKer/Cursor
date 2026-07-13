import type { LessonCatalogLevel } from '@/lib/lessonCatalog'

export type QuickTestLevelId = Extract<LessonCatalogLevel, 'A1' | 'A2' | 'B1' | 'B2'>

export type QuickTestSlot = 1 | 2 | 3 | 4 | 5

export type QuickTestScoreBand = 'perfect' | 'strong' | 'start'

export type QuickTestEntrySource =
  | 'external_deep_link'
  | 'internal_menu'
  | 'test_lobby'
  | 'shared_link'

export interface QuickTestQuestion {
  id: string
  prompt: string
  options: [string, string, string]
  correctIndex: 0 | 1 | 2
  explanationRu: string
  slot: QuickTestSlot
  format: 'complete' | 'natural' | 'find-error' | 'context' | 'distinguish'
  skillTag: string
  mistakeTag: string
}

export interface QuickTestVariant {
  id: string
  questions: QuickTestQuestion[]
}

export interface QuickTestTopicBank {
  lessonId: string
  slug: string
  level: QuickTestLevelId
  title: string
  variants: QuickTestVariant[]
}

export interface QuickTestCatalogEntry {
  lessonId: string
  slug: string
  level: QuickTestLevelId
  title: string
  enabled: boolean
  variantIds: string[]
}

export interface QuickTestAnswerRecord {
  questionId: string
  selectedIndex: number
  correct: boolean
  mistakeTag: string
}

export interface QuickTestResumeState {
  slug: string
  variantId: string
  currentIndex: number
  answers: QuickTestAnswerRecord[]
  startedAt: number | null
  firstAnswerAt: number | null
}

export interface QuickTestProgressState {
  byLessonId: Record<string, { completedVariantIds: string[] }>
}

export interface QuickTestOpenLessonIntent {
  lessonId: string
  source: QuickTestEntrySource
  audience?: 'child' | 'adult'
  createdAt: number
}

export interface QuickTestEntryContext {
  source: 'internal_menu'
  audience: 'child' | 'adult'
}
