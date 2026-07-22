import type { LessonCatalogLevel, LessonTopicCatalogItem } from '@/lib/lessonCatalog'
import type { LessonIntroExample } from '@/types/lesson'

export type CatalogBrowseIntent = 'lesson' | 'reference'

export interface ReferenceSheet {
  id: string
  title: string
  teaser: string
  level: LessonCatalogLevel | null
  hasPractice: boolean
  hook: string | null
  rule: string[]
  formula: string[]
  traps: string[]
  examples: LessonIntroExample[]
  selfCheck: string | null
  relatedLessonId: string
}

export type ReferenceTopicCatalogItem = LessonTopicCatalogItem & {
  teaser: string
}
