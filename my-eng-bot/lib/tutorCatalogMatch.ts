import type { LessonCatalogLevel, LessonTopicCatalogItem } from '@/lib/lessonCatalog'
import { getLessonTopicById, PRACTICE_TOPICS_BY_AUDIENCE, getTheoryLessonTopics } from '@/lib/lessonCatalog'
import { findTheoryTopicCatalogCandidatesByMenuKeys, normalizeLessonCatalogQuery, scoreLessonCatalogQueryKey } from '@/lib/lessonTopicSearch'
import { getTheoryLessonsForTagIdsUnion } from '@/lib/theoryLessonsByTagIds'
import { getTheoryTagById } from '@/lib/lessonTheoryTags'
import { findTheoryTagCandidatesGlobally } from '@/lib/theoryTagSearch'
import type { Audience, LevelId } from '@/lib/types'

export type TutorCatalogLessonCandidate = {
  lessonId: string
  /** Строка для списка выбора (совпадает с title intent от buildFallbackTutorLearningIntent). */
  suggestionLabel: string
  level: LessonCatalogLevel
  score: number
}

/** Минимальный score совпадения (как в поиске тегов / меню ключей). */
export const TUTOR_CATALOG_MIN_SCORE = 30

const LEVEL_MATCH_BOOST = 10
const MAX_RESULTS = 5

function levelIdToCatalogLevel(level: LevelId | undefined): LessonCatalogLevel | null {
  if (!level || level === 'all') return null
  const map: Record<string, LessonCatalogLevel> = {
    starter: 'A1',
    a1: 'A1',
    a2: 'A2',
    b1: 'B1',
    b2: 'B2',
    c1: 'C1',
    c2: 'C2',
  }
  return map[level] ?? null
}

/** Короткая подпись: совпадает с каноническим title урока + уровень (укладывается в лимит intent). */
function buildTutorCatalogSuggestionLabel(topic: LessonTopicCatalogItem): string {
  return `${topic.title} (${topic.level})`
}

function scoreTagLabelsOnTopic(topic: LessonTopicCatalogItem, normalizedQuery: string): { score: number; reason: string } {
  const keys: string[] = []
  for (const id of topic.tagIds ?? []) {
    const t = getTheoryTagById(id)
    if (!t) continue
    keys.push(t.menuLabelRu, t.menuLabelEn, t.title, t.focusLine)
    if (t.titleRu) keys.push(t.titleRu)
  }
  let best = 0
  let reason = ''
  for (const raw of keys) {
    const k = normalizeLessonCatalogQuery(raw)
    if (!k) continue
    const s = scoreLessonCatalogQueryKey(normalizedQuery, k)
    if (s > best) {
      best = s
      reason = k
    }
  }
  return { score: best, reason }
}

/**
 * Уроки из каталога теории (теги «Темы» + те же тексты, что списки по уровням), ранжированные под запрос репетитора.
 */
export function findTutorCatalogLessonCandidates(
  query: string,
  audience: Audience,
  userLevel?: LevelId
): TutorCatalogLessonCandidate[] {
  const normalizedQuery = normalizeLessonCatalogQuery(query)
  if (!normalizedQuery) return []

  const catalogLevel = levelIdToCatalogLevel(userLevel)
  const merged = new Map<string, { score: number; reason: string }>()

  function merge(lessonId: string, score: number, reason: string) {
    const prev = merged.get(lessonId)
    if (!prev || score > prev.score) merged.set(lessonId, { score, reason })
  }

  for (const tag of findTheoryTagCandidatesGlobally(query, 12)) {
    if (tag.score < TUTOR_CATALOG_MIN_SCORE) continue
    for (const lesson of getTheoryLessonsForTagIdsUnion([tag.tagId])) {
      let s = tag.score
      if (catalogLevel && lesson.level === catalogLevel) s += LEVEL_MATCH_BOOST
      merge(lesson.id, s, tag.title)
    }
  }

  for (const c of findTheoryTopicCatalogCandidatesByMenuKeys(query, audience, 8)) {
    let s = c.score
    const lesson = getLessonTopicById(c.lessonId)
    if (lesson && catalogLevel && lesson.level === catalogLevel) s += LEVEL_MATCH_BOOST
    merge(c.lessonId, s, c.reason)
  }

  for (const topic of getTheoryLessonTopics()) {
    if (!topic.enabled || !topic.hasTheory) continue
    const { score, reason } = scoreTagLabelsOnTopic(topic, normalizedQuery)
    if (score < TUTOR_CATALOG_MIN_SCORE) continue
    let s = score
    if (catalogLevel && topic.level === catalogLevel) s += LEVEL_MATCH_BOOST
    merge(topic.id, s, reason || topic.title)
  }

  const rows: TutorCatalogLessonCandidate[] = [...merged.entries()]
    .map(([lessonId, v]) => {
      const topic = getLessonTopicById(lessonId)
      if (!topic) return null
      if (v.score < TUTOR_CATALOG_MIN_SCORE) return null
      return {
        lessonId,
        suggestionLabel: buildTutorCatalogSuggestionLabel(topic),
        level: topic.level,
        score: v.score,
      }
    })
    .filter((r): r is TutorCatalogLessonCandidate => r !== null)
    .sort((a, b) => b.score - a.score)

  return rows.slice(0, MAX_RESULTS)
}

export function tutorCatalogWhyRu(lessonId: string, audience: Audience): string {
  const topic = getLessonTopicById(lessonId)
  if (!topic) return 'Урок из каталога теории.'
  const copy = PRACTICE_TOPICS_BY_AUDIENCE[audience][topic.id]
  const line = copy?.long?.trim()
  return line ? `Урок из каталога: ${line}` : 'Урок из каталога теории (разделы «Темы» и «Уровни»).'
}
