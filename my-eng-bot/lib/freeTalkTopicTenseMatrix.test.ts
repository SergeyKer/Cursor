import { describe, expect, it } from 'vitest'
import { CHILD_TENSES, TENSES } from './constants'
import type { TenseId } from './types'
import { CHILD_FREE_TALK_TOPIC_POOL, ADULT_FREE_TALK_TOPIC_POOL } from './freeTalkTopicSuggestions'
import { buildFreeTalkTopicAnchorQuestion } from './freeTalkQuestionAnchor'
import { isLikelyQuestionInRequiredTense } from './dialogueTenseInference'
import { topicLineToAnchorLabel } from './topicAnchorLabel'

const ADULT_TENSES: TenseId[] = TENSES.map((x) => x.id).filter((id): id is TenseId => id !== 'all')

function anchorQuestionForCell(params: {
  topicLine: string
  tense: TenseId
  audience: 'child' | 'adult'
}): string {
  const label = topicLineToAnchorLabel(params.topicLine)
  return buildFreeTalkTopicAnchorQuestion({
    keywords: [],
    topicLabel: label,
    tense: params.tense,
    audience: params.audience,
    diversityKey: `matrix|${params.audience}|${params.tense}|${label}`,
  })
}

describe('freeTalk topic × tense anchor matrix (offline)', () => {
  for (const audience of ['child', 'adult'] as const) {
    const topics = audience === 'child' ? CHILD_FREE_TALK_TOPIC_POOL : ADULT_FREE_TALK_TOPIC_POOL
    const tenses = audience === 'child' ? CHILD_TENSES : ADULT_TENSES

    for (const tense of tenses) {
      for (const topicLine of topics) {
        it(`[${audience}] ${tense} — ${topicLine.slice(0, 40)}…`, () => {
          const q = anchorQuestionForCell({ topicLine, tense, audience })
          expect(q.length).toBeGreaterThan(10)
          expect(q).toMatch(/\?/)
          expect(
            isLikelyQuestionInRequiredTense(q, tense),
            `Expected tense ${tense} for: ${q}`
          ).toBe(true)
        })
      }
    }
  }
})
