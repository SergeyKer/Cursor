import type { LessonCatalogLevel } from '@/lib/lessonCatalog'
import { getPrebuiltSheet, hasStaticPrebuiltSheet } from '@/lib/reference/prebuiltStore'

export type ReferenceSyllabusSource = 'faq' | 'cefr_gap'

/** lesson_ready / sheet_ready open a sheet; planned is browse-only until content exists. */
export type ReferenceSyllabusStatus = 'lesson_ready' | 'sheet_ready' | 'planned'

export type ReferenceSyllabusTopic = {
  topicKey: string
  level: LessonCatalogLevel
  titleRu: string
  titleEn: string
  teaser: string
  tags: string[]
  lessonId: string | null
  status: ReferenceSyllabusStatus
  source: ReferenceSyllabusSource
  /** Extra search needles (EN/RU). */
  searchAliases: string[]
}

export function isSyllabusTopicOpenable(topic: ReferenceSyllabusTopic): boolean {
  if (topic.status === 'lesson_ready' && Boolean(topic.lessonId?.trim())) return true
  if (topic.status === 'sheet_ready') return true
  return hasStaticPrebuiltSheet(topic.topicKey) || getPrebuiltSheet(topic.topicKey) != null
}
