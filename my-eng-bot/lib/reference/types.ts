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
  /** A vs B / neighbor senses; omit empty in UI. */
  contrast: string[]
  examples: LessonIntroExample[]
  selfCheck: string | null
  /** Lesson CTA only when non-null. */
  relatedLessonId: string | null
}

export type ReferenceTopicCatalogItem = LessonTopicCatalogItem & {
  teaser: string
}
