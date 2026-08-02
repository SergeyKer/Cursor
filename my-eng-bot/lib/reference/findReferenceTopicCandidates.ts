import { getReferenceLessonTopics } from '@/lib/reference/getReferenceLessonTopics'
import { findOpenableSyllabusLessonHits } from '@/lib/reference/syllabus/search'
import {
  findTheoryTopicCatalogCandidatesByMenuKeys,
  type PracticeTopicCandidate,
} from '@/lib/lessonTopicSearch'
import type { Audience } from '@/lib/types'

const STRONG_HIT_SCORE = 80

export function findReferenceTopicCandidates(
  query: string,
  audience: Audience,
  limit = 5
): PracticeTopicCandidate[] {
  const referenceTopics = getReferenceLessonTopics()
  const allowed = new Set(referenceTopics.map((topic) => topic.id))
  const titleByLesson = new Map(referenceTopics.map((t) => [t.id, t.title]))
  const byLesson = new Map<string, PracticeTopicCandidate>()

  for (const candidate of findTheoryTopicCatalogCandidatesByMenuKeys(
    query,
    audience,
    Math.max(limit * 2, 8)
  )) {
    if (!allowed.has(candidate.lessonId)) continue
    const prev = byLesson.get(candidate.lessonId)
    if (!prev || candidate.score > prev.score) byLesson.set(candidate.lessonId, candidate)
  }

  for (const hit of findOpenableSyllabusLessonHits(query, limit * 2)) {
    if (!allowed.has(hit.lessonId)) continue
    const prev = byLesson.get(hit.lessonId)
    const catalogTitle = titleByLesson.get(hit.lessonId)
    const next: PracticeTopicCandidate = {
      lessonId: hit.lessonId,
      title: catalogTitle || hit.title,
      score: hit.score,
      reason: hit.topicKey,
    }
    if (!prev || next.score > prev.score) {
      byLesson.set(hit.lessonId, {
        ...next,
        title: catalogTitle || prev?.title || next.title,
      })
    } else if (prev && catalogTitle) {
      byLesson.set(hit.lessonId, { ...prev, title: catalogTitle })
    }
  }

  return [...byLesson.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, limit))
}

/** Один явный лидер: единственный кандидат или score ≥ 80 с отрывом. */
export function pickStrongReferenceHit(
  candidates: PracticeTopicCandidate[]
): PracticeTopicCandidate | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0] ?? null
  const [first, second] = candidates
  if (!first) return null
  if (first.score >= STRONG_HIT_SCORE && first.score - (second?.score ?? 0) >= 20) {
    return first
  }
  return null
}

/**
 * Submit hit-only: strong leader, else sole candidate.
 * Multiple weak hits → null (keep list visible; do not silent-open).
 */
export function pickReferenceSearchSubmitHit(
  candidates: PracticeTopicCandidate[]
): PracticeTopicCandidate | null {
  return pickStrongReferenceHit(candidates)
}
