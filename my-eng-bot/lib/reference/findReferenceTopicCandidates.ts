import { getReferenceLessonTopics } from '@/lib/reference/getReferenceLessonTopics'
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
  const allowed = new Set(getReferenceLessonTopics().map((topic) => topic.id))
  return findTheoryTopicCatalogCandidatesByMenuKeys(query, audience, Math.max(limit * 2, 8))
    .filter((candidate) => allowed.has(candidate.lessonId))
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
