/**
 * Align explain topicAnchor.canonicalKey to known FAQ topicKey when query strict-matches FAQ.
 * Pure: no React, no fetch.
 */

import { matchLocalFaq } from '@/lib/tutor/localFaq'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import type { LevelId } from '@/lib/types'

export type AlignExplainTopicToFaqParams = {
  answer: TutorExplainAnswer
  query: string
  level?: LevelId | null
}

/**
 * If `query` strict-matches local FAQ, rewrite canonicalKey to entry.topicKey.
 * Leaves title / skillTags unchanged. Miss → same answer reference-equal enough (spread copy only on hit).
 */
export function alignExplainTopicToFaq(
  params: AlignExplainTopicToFaqParams
): TutorExplainAnswer {
  const hit = matchLocalFaq(params.query, params.level)
  if (!hit) return params.answer

  const topicKey = hit.entry.topicKey.trim()
  if (!topicKey) return params.answer
  if (params.answer.topicAnchor.canonicalKey === topicKey) return params.answer

  return {
    ...params.answer,
    topicAnchor: {
      ...params.answer.topicAnchor,
      canonicalKey: topicKey,
    },
  }
}
