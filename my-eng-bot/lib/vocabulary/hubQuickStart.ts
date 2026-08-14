import { pickNextSessionWords, VOCAB_CYCLE_SIZE } from '@/lib/vocabulary/srs'
import type {
  NecessaryWord,
  VocabularySessionRoute,
  VocabularyWordProgress,
} from '@/types/vocabulary'

export const HUB_QUICK_START_SIZE = VOCAB_CYCLE_SIZE

export const HUB_QUICK_START_DEFAULT_ROUTE: VocabularySessionRoute = { kind: 'world', worldId: 'home' }

export function resolveHubQuickStartRoute(
  last: VocabularySessionRoute | null | undefined
): VocabularySessionRoute {
  return last ?? HUB_QUICK_START_DEFAULT_ROUTE
}

export function poolForHubQuickStart(
  route: VocabularySessionRoute,
  sources: {
    catalog: NecessaryWord[]
    packWordsForId: (packId: string) => NecessaryWord[]
    phrasebookWordsForId: (topicId: string) => NecessaryWord[]
  }
): NecessaryWord[] {
  if (route.kind === 'world') {
    return sources.catalog.filter((word) => word.status === 'active' && word.primaryWorld === route.worldId)
  }
  if (route.kind === 'pack') return sources.packWordsForId(route.packId)
  if (route.kind === 'phrasebook') return sources.phrasebookWordsForId(route.topicId)
  return sources.catalog.filter(
    (word) =>
      word.status === 'active' &&
      word.primaryLevel === route.levelId &&
      word.primaryVocabularyTopic === route.topicId
  )
}

export function wordsForHubQuickStart(params: {
  pool: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
}): NecessaryWord[] {
  return pickNextSessionWords({
    words: params.pool,
    progressMap: params.progressMap,
    size: HUB_QUICK_START_SIZE,
  })
}

export type VocabFocusPair = { id: number; en: string; ru: string }

export function formatVocabFocusPairs(words: NecessaryWord[]): VocabFocusPair[] {
  return words
    .slice(0, HUB_QUICK_START_SIZE)
    .map((word) => ({
      id: word.id,
      en: word.en.trim(),
      ru: word.ru.trim(),
    }))
    .filter((pair) => Boolean(pair.en))
}
