import {
  getLessonTopicById,
  getTheoryLessonTopics,
  type LessonCatalogLevel,
  type LessonTopicCatalogItem,
} from '@/lib/lessonCatalog'
import {
  buildReferenceSheetByLessonId,
  isIntroSuitableForReference,
} from '@/lib/reference/buildReferenceSheet'
import type { ReferenceTopicCatalogItem } from '@/lib/reference/types'
import { getStructuredLessonById } from '@/lib/structuredLessons'

function toReferenceTopic(topic: LessonTopicCatalogItem): ReferenceTopicCatalogItem | null {
  if (!topic.enabled || !topic.hasTheory) return null
  const lesson = getStructuredLessonById(topic.id)
  if (!lesson?.intro || !isIntroSuitableForReference(lesson.intro)) return null
  const sheet = buildReferenceSheetByLessonId(topic.id)
  if (!sheet) return null
  return {
    ...topic,
    teaser: sheet.teaser,
  }
}

export function getReferenceLessonTopics(level?: LessonCatalogLevel): ReferenceTopicCatalogItem[] {
  return getTheoryLessonTopics(level)
    .map(toReferenceTopic)
    .filter((topic): topic is ReferenceTopicCatalogItem => Boolean(topic))
}

export function isReferenceLessonId(lessonId: string): boolean {
  const topic = getLessonTopicById(lessonId)
  if (!topic) return false
  return toReferenceTopic(topic) != null
}
