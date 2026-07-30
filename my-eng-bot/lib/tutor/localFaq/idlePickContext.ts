import { getLessonTopicCatalog } from '@/lib/lessonCatalog'
import {
  getAttentionZones,
  listLearningSignals,
  loadSkillMasteryMap,
} from '@/lib/learningMemory'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { topicKeysFromSkillTagIds } from '@/lib/tutor/localFaq/skillTopicMap'
import { listShownFaqIds } from '@/lib/tutor/localFaq/shownFaqStore'

/** Client-only filters for idle FAQ novelty (safe on SSR → empty). */
export function buildIdleFaqFilters(): {
  shownIds: string[]
  bannedTopicKeys: string[]
  boostTopicKeys: string[]
} {
  if (typeof window === 'undefined') {
    return { shownIds: [], bannedTopicKeys: [], boostTopicKeys: [] }
  }

  const zones = getAttentionZones(listLearningSignals(), loadSkillMasteryMap())
  const bannedTopicKeys = topicKeysFromSkillTagIds(zones.map((z) => z.skillTagId))

  const progress = loadLessonProgressMap()
  let latestLessonId: string | null = null
  let latestAt = 0
  for (const row of Object.values(progress)) {
    const at = Date.parse(row.lastCompleted || '')
    if (!Number.isFinite(at) || at <= latestAt) continue
    latestAt = at
    latestLessonId = row.lessonId
  }
  const topic = latestLessonId
    ? getLessonTopicCatalog().find((t) => t.id === latestLessonId)
    : null
  const boostTopicKeys = topicKeysFromSkillTagIds(topic?.tagIds ?? [])

  return {
    shownIds: listShownFaqIds(),
    bannedTopicKeys,
    boostTopicKeys,
  }
}
