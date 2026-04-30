import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { LessonData } from '@/types/lesson'

export type LessonCatalogLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface LessonTopicCatalogItem {
  id: string
  slug: string
  title: string
  level: LessonCatalogLevel
  order: number
  enabled: boolean
  hasTheory: boolean
  hasPractice: boolean
}

const LESSON_TOPIC_CATALOG: LessonTopicCatalogItem[] = [
  {
    id: '1',
    slug: 'its-time-to',
    title: 'It’s / It’s time to',
    level: 'A2',
    order: 10,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
  },
  {
    id: '2',
    slug: 'who-likes',
    title: 'Who ...?',
    level: 'A2',
    order: 20,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
  },
  {
    id: '3',
    slug: 'embedded-questions',
    title: 'I know what she likes',
    level: 'A2',
    order: 30,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
  },
]

function byOrder(left: LessonTopicCatalogItem, right: LessonTopicCatalogItem): number {
  return left.order - right.order
}

export function getLessonTopicCatalog(): LessonTopicCatalogItem[] {
  return [...LESSON_TOPIC_CATALOG].sort(byOrder)
}

export function getTheoryLessonTopics(level?: LessonCatalogLevel): LessonTopicCatalogItem[] {
  return getLessonTopicCatalog().filter((topic) => topic.hasTheory && (!level || topic.level === level))
}

export function getPracticeLessonTopics(level?: LessonCatalogLevel): LessonTopicCatalogItem[] {
  return getLessonTopicCatalog().filter((topic) => topic.hasPractice && (!level || topic.level === level))
}

export function getLessonTopicById(lessonId: string): LessonTopicCatalogItem | null {
  return getLessonTopicCatalog().find((topic) => topic.id === lessonId) ?? null
}

export function getPracticeLessonById(lessonId: string): LessonData | null {
  return getStructuredLessonById(lessonId)
}

export function pickQuickStartPracticeTopic(level: LessonCatalogLevel = 'A2'): LessonTopicCatalogItem | null {
  const enabledForLevel = getPracticeLessonTopics(level).filter((topic) => topic.enabled)
  const pool = enabledForLevel.length > 0 ? enabledForLevel : getPracticeLessonTopics().filter((topic) => topic.enabled)
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]
}
