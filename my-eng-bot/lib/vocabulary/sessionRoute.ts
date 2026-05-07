import { VOCABULARY_LEVELS } from '@/lib/vocabulary/levels'
import { VOCABULARY_TOPICS } from '@/lib/vocabulary/topics'
import { VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type {
  VocabularySessionHistoryItem,
  VocabularySessionRoute,
  VocabularyWorldId,
} from '@/types/vocabulary'

const WORLD_IDS = new Set<VocabularyWorldId>(['home', 'school', 'travel', 'digital', 'core'])
const LEVEL_IDS = new Set(VOCABULARY_LEVELS.map((level) => level.id))
const TOPIC_IDS = new Set(VOCABULARY_TOPICS.map((topic) => topic.id))

export function normalizeVocabularySessionRoute(
  raw: unknown
): VocabularySessionRoute | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<VocabularySessionHistoryItem> & { worldId?: string }

  const route = row.route
  if (route?.kind === 'world' && route.worldId && WORLD_IDS.has(route.worldId)) {
    return { kind: 'world', worldId: route.worldId }
  }
  if (
    route?.kind === 'level' &&
    route.levelId &&
    route.topicId &&
    LEVEL_IDS.has(route.levelId) &&
    TOPIC_IDS.has(route.topicId)
  ) {
    return { kind: 'level', levelId: route.levelId, topicId: route.topicId }
  }

  const legacyWorld = row.worldId
  if (legacyWorld && WORLD_IDS.has(legacyWorld as VocabularyWorldId)) {
    return { kind: 'world', worldId: legacyWorld as VocabularyWorldId }
  }

  return null
}

export function formatVocabularySessionRouteTitle(route: VocabularySessionRoute): string {
  if (route.kind === 'world') {
    return VOCABULARY_WORLDS.find((world) => world.id === route.worldId)?.title ?? route.worldId
  }
  const levelPrefix = VOCABULARY_LEVELS.find((level) => level.id === route.levelId)?.prefixLabel ?? route.levelId
  const topicTitle = VOCABULARY_TOPICS.find((topic) => topic.id === route.topicId)?.title ?? route.topicId
  return `${levelPrefix} · ${topicTitle}`
}
