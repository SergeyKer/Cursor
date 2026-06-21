import type { LessonCatalogLevel, LessonTopicCatalogItem } from '@/lib/lessonCatalog'
import { getTheoryLessonTopics } from '@/lib/lessonCatalog'
import type { TheoryLessonsByLevel } from '@/lib/lessonTheoryTags'

const LEVEL_ORDER: LessonCatalogLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function levelRank(level: LessonCatalogLevel): number {
  const i = LEVEL_ORDER.indexOf(level)
  return i === -1 ? 999 : i
}

/** Группировка плоского списка уроков по CEFR для отображения в меню. */
export function groupTheoryLessonsByLevel(lessons: LessonTopicCatalogItem[]): TheoryLessonsByLevel {
  const out: TheoryLessonsByLevel = {}
  for (const lesson of lessons) {
    const lvl = lesson.level
    if (!out[lvl]) out[lvl] = []
    out[lvl]!.push(lesson)
  }
  for (const k of Object.keys(out) as LessonCatalogLevel[]) {
    out[k]!.sort((a, b) => a.order - b.order)
  }
  return out
}

/**
 * Каталожные уроки с теорией, у которых tagIds пересекается с любым из переданных тегов.
 * Один урок - одна запись, сортировка: уровень CEFR, затем order.
 */
export function getTheoryLessonsForTagIdsUnion(tagIds: string[]): LessonTopicCatalogItem[] {
  const want = new Set(tagIds.filter(Boolean))
  if (want.size === 0) return []

  const byId = new Map<string, LessonTopicCatalogItem>()
  for (const topic of getTheoryLessonTopics()) {
    if (!topic.enabled || !topic.hasTheory) continue
    const ids = topic.tagIds ?? []
    const hit = ids.some((id) => want.has(id))
    if (!hit) continue
    if (!byId.has(topic.id)) byId.set(topic.id, topic)
  }

  return [...byId.values()].sort((a, b) => {
    const lr = levelRank(a.level) - levelRank(b.level)
    if (lr !== 0) return lr
    return a.order - b.order
  })
}
