import type { LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import { CALL_REVIEW_MAX_TOPICS } from '@/lib/engvo/callReview/types'

function normalizeTopicKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[—–-]/g, '-')
    .trim()
}

/**
 * Unique review topics: by id first, then normalized title.
 * Preserves first-seen order. Caps at CALL_REVIEW_MAX_TOPICS.
 */
export function dedupeReviewTopics(
  topics: readonly LanguageNoteReviewTopic[],
  max = CALL_REVIEW_MAX_TOPICS
): LanguageNoteReviewTopic[] {
  const out: LanguageNoteReviewTopic[] = []
  const seenIds = new Set<string>()
  const seenTitles = new Set<string>()

  for (const topic of topics) {
    const id = topic.id.trim()
    const title = topic.title.trim()
    if (!title) continue
    const titleKey = normalizeTopicKey(title)
    if (id && seenIds.has(id)) continue
    if (seenTitles.has(titleKey)) continue
    if (id) seenIds.add(id)
    seenTitles.add(titleKey)
    out.push({ id: id || titleKey, title })
    if (out.length >= max) break
  }
  return out
}
