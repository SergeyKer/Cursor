import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { Audience, LevelId } from '@/lib/types'
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
  /** Теги таксономии теории (см. `lib/lessonTheoryTags.ts`). */
  tagIds?: string[]
}

const LESSON_TOPIC_CATALOG: LessonTopicCatalogItem[] = [
  {
    id: '4',
    slug: 'introducing-yourself',
    title: 'I am / I am from',
    level: 'A1',
    order: 5,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '1',
    slug: 'its-time-to',
    title: 'It’s / It’s time to',
    level: 'A2',
    order: 10,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['formal-it'],
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
    tagIds: ['special-questions', 'subject-questions'],
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
    tagIds: ['reported-speech', 'word-order'],
  },
]

export const PRACTICE_TOPICS_BY_AUDIENCE: Record<Audience, Record<string, { short: string; long: string }>> = {
  child: {
    '4': {
      short: 'Знакомство',
      long: 'Кто я, откуда я и какой я — через I am.',
    },
    '1': {
      short: 'Погода и «пора»',
      long: "Как вокруг и что пора делать: It's / time to / time for.",
    },
    '2': {
      short: 'Кто?',
      long: 'Спрашиваем, кто это и кто что делает — через Who.',
    },
    '3': {
      short: 'Вопрос внутри',
      long: 'Внутри не прямой вопрос, а обычный порядок: I know what she likes.',
    },
  },
  adult: {
    '4': {
      short: 'Представление о себе',
      long: "Кто я, откуда я и какой я — через I am (часто I'm).",
    },
    '1': {
      short: 'Состояние и «пора»',
      long: "It's + состояние; time to + глагол; time for + событие.",
    },
    '2': {
      short: 'Вопросы с Who',
      long: 'Кто это / кто делает: Who + часто -s в вопросе и ответе.',
    },
    '3': {
      short: 'Встроенный вопрос',
      long: 'После what/where/when внутри — порядок как в утверждении.',
    },
  },
}

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

export function getLessonTopicBySlug(slug: string): LessonTopicCatalogItem | null {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  return getLessonTopicCatalog().find((topic) => topic.slug === normalized) ?? null
}

/** CEFR уровня урока в каталоге → LevelId для фишек, кэша и CEFR-guard. */
export function catalogLevelToLevelId(level: LessonCatalogLevel): LevelId {
  const map: Record<LessonCatalogLevel, LevelId> = {
    A1: 'a1',
    A2: 'a2',
    B1: 'b1',
    B2: 'b2',
    C1: 'c1',
    C2: 'c2',
  }
  return map[level]
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

export function getPracticeTopicSearchTexts(topic: LessonTopicCatalogItem, audience: Audience): string[] {
  const copy = PRACTICE_TOPICS_BY_AUDIENCE[audience][topic.id]
  return [topic.title, topic.slug, copy?.short ?? '', copy?.long ?? ''].filter(Boolean)
}

function normalizeTopicLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function getMenuTopicCopyByIntroTopic(
  topic: string,
  audience: Audience,
  fallback?: { short?: string; long?: string }
): { title: string; short: string; long: string } {
  const fallbackShort = fallback?.short?.trim() || 'Тема из меню уроков'
  const fallbackLong = fallback?.long?.trim() || 'Открыли выбранный урок.'
  const normalizedTopic = normalizeTopicLabel(topic)
  if (!normalizedTopic) {
    return {
      title: topic.trim() || 'Урок',
      short: fallbackShort,
      long: fallbackLong,
    }
  }
  const catalogTopic = getLessonTopicCatalog().find((item) => normalizeTopicLabel(item.title) === normalizedTopic)
  if (!catalogTopic) {
    return {
      title: topic.trim(),
      short: fallbackShort,
      long: fallbackLong,
    }
  }
  const copy = PRACTICE_TOPICS_BY_AUDIENCE[audience][catalogTopic.id]
  return {
    title: catalogTopic.title,
    short: copy?.short ?? fallbackShort,
    long: copy?.long ?? fallbackLong,
  }
}
