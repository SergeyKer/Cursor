import { normalizeFaqText } from '@/lib/tutor/localFaq/normalizeFaq'
import {
  getReferenceSyllabusTopics,
  listOpenableSyllabusTopics,
} from '@/lib/reference/syllabus/topics'
import type { ReferenceSyllabusTopic } from '@/lib/reference/syllabus/types'
import { isSyllabusTopicOpenable } from '@/lib/reference/syllabus/types'

function scoreNeedle(haystack: string, needle: string): number {
  if (!needle || !haystack) return 0
  if (haystack === needle) return 120
  if (haystack.startsWith(needle)) return 100
  if (haystack.includes(needle)) return 70
  return 0
}

/** Short aliases (is/am/are) only exact — not substring of "is going". */
function aliasMatchScore(alias: string, norm: string): number {
  if (!alias || !norm) return 0
  if (alias === norm) return 120
  const compact = alias.replace(/\s+/g, '')
  if (compact.length < 4) return 0
  if (alias.includes(norm) || norm.includes(alias)) return 80
  return 0
}

function topicSearchBlob(topic: ReferenceSyllabusTopic): string {
  return normalizeFaqText(
    [topic.topicKey, topic.titleRu, topic.titleEn, topic.teaser, ...topic.searchAliases].join(' ')
  )
}

export type SyllabusSearchHit = {
  topic: ReferenceSyllabusTopic
  score: number
}

/** True when query is long enough to run syllabus topic search / browse filter. */
export function isSyllabusTopicSearchActive(query: string): boolean {
  return normalizeFaqText(query).length >= 2
}

/** Search all syllabus rows (including planned) for discovery / future browse. */
export function findSyllabusTopicCandidates(
  query: string,
  limit = 8
): SyllabusSearchHit[] {
  if (!isSyllabusTopicSearchActive(query)) return []
  const norm = normalizeFaqText(query)

  const scored: SyllabusSearchHit[] = []
  for (const topic of getReferenceSyllabusTopics()) {
    const blob = topicSearchBlob(topic)
    let score = scoreNeedle(blob, norm)
    for (const alias of topic.searchAliases) {
      const a = normalizeFaqText(alias)
      score = Math.max(
        score,
        scoreNeedle(a, norm),
        scoreNeedle(blob, a) > 0 && norm === a ? 120 : 0,
        aliasMatchScore(a, norm)
      )
    }
    const keyNorm = normalizeFaqText(topic.topicKey.replace(/_/g, ' '))
    score = Math.max(score, scoreNeedle(keyNorm, norm))
    if (score >= 40) scored.push({ topic, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.topic.titleRu.localeCompare(b.topic.titleRu, 'ru'))
    .slice(0, Math.max(1, limit))
}

/** Openable syllabus → lessonId hits for hub search merge. */
export function findOpenableSyllabusLessonHits(
  query: string,
  limit = 8
): Array<{ lessonId: string; title: string; score: number; topicKey: string }> {
  if (!isSyllabusTopicSearchActive(query)) return []
  const norm = normalizeFaqText(query)

  const out: Array<{ lessonId: string; title: string; score: number; topicKey: string }> = []
  for (const hit of findSyllabusTopicCandidates(query, limit * 2)) {
    if (!isSyllabusTopicOpenable(hit.topic) || !hit.topic.lessonId) continue
    out.push({
      lessonId: hit.topic.lessonId,
      title: hit.topic.titleEn || hit.topic.titleRu,
      score: hit.score,
      topicKey: hit.topic.topicKey,
    })
  }

  // Prefer openable list if candidate search missed short tokens mapped only via aliases
  if (out.length === 0) {
    for (const topic of listOpenableSyllabusTopics()) {
      for (const alias of topic.searchAliases) {
        const a = normalizeFaqText(alias)
        if (!a) continue
        if (norm === a) {
          out.push({
            lessonId: topic.lessonId!,
            title: topic.titleEn || topic.titleRu,
            score: 120,
            topicKey: topic.topicKey,
          })
          continue
        }
        // Substantial prefix only — not "is" ⊂ "is going"
        if (a.replace(/\s+/g, '').length < 4) continue
        if (a.startsWith(norm) || norm.startsWith(a)) {
          out.push({
            lessonId: topic.lessonId!,
            title: topic.titleEn || topic.titleRu,
            score: 90,
            topicKey: topic.topicKey,
          })
        }
      }
    }
  }

  const byLesson = new Map<string, (typeof out)[number]>()
  for (const row of out) {
    const prev = byLesson.get(row.lessonId)
    if (!prev || row.score > prev.score) byLesson.set(row.lessonId, row)
  }
  return [...byLesson.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
}
