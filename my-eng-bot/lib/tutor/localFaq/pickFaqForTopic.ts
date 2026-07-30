import { listLocalFaqForLevels, resolveFaqLevelWindow } from '@/lib/tutor/localFaq/catalog'
import { skillTagIdToTopicKey } from '@/lib/tutor/localFaq/skillTopicMap'
import type { LocalFaqEntry } from '@/lib/tutor/localFaq/types'
import type { AttentionZone } from '@/lib/learningMemory/types'
import type { LevelId } from '@/lib/types'

function genreRank(genre: LocalFaqEntry['genre']): number {
  if (genre === 'grammar' || genre === 'contrast') return 0
  return 1
}

/**
 * Best FAQ card for a topic in the CEFR window.
 * Does NOT require idleEligible (My Plan ≠ idle discovery).
 */
export function pickCanonicalFaqForTopic(params: {
  topicKey: string
  level: LevelId | null | undefined
}): LocalFaqEntry | null {
  const topicKey = params.topicKey.trim()
  if (!topicKey) return null

  const levels = resolveFaqLevelWindow(params.level)
  const candidates = listLocalFaqForLevels(levels).filter((e) => e.topicKey === topicKey)
  if (candidates.length === 0) return null

  candidates.sort(
    (a, b) =>
      genreRank(a.genre) - genreRank(b.genre) ||
      b.popularity - a.popularity ||
      a.id.localeCompare(b.id)
  )
  return candidates[0] ?? null
}

/** Shared resolver for selectTutorTask + listTutorQuestionJobs. */
export function resolveFaqCanonForZone(
  zone: Pick<AttentionZone, 'skillTagId'>,
  level: LevelId | null | undefined
): LocalFaqEntry | null {
  const topicKey = skillTagIdToTopicKey(zone.skillTagId)
  if (!topicKey) return null
  return pickCanonicalFaqForTopic({ topicKey, level })
}
