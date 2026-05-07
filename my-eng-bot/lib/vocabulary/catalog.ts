import { initialStatusForWord } from '@/lib/vocabulary/cleanupRules'
import { inferLevel, VOCABULARY_LEVELS } from '@/lib/vocabulary/levels'
import { inferVocabularyTopic, VOCABULARY_TOPICS } from '@/lib/vocabulary/topics'
import { countActiveWordsByWorld, inferWorlds, VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type { NecessaryWord, NecessaryWordsCatalog, ParsedNecessaryWord } from '@/types/vocabulary'

export function buildNecessaryWordsCatalog(
  sourceWords: ParsedNecessaryWord[],
  meta?: { sourceFile?: string; dictionaryVersion?: number }
): NecessaryWordsCatalog {
  const words: NecessaryWord[] = sourceWords.map((word) => {
    const status = initialStatusForWord(word.id)
    const { primaryWorld, secondaryWorld, tags } = inferWorlds(word)
    const primaryLevel = inferLevel(word, primaryWorld)
    const primaryVocabularyTopic = inferVocabularyTopic(word, primaryWorld)

    return {
      ...word,
      status,
      tags,
      primaryWorld,
      primaryLevel,
      primaryVocabularyTopic,
      ...(secondaryWorld ? { secondaryWorld } : {}),
    }
  })

  return {
    dictionaryVersion: meta?.dictionaryVersion ?? 2,
    generatedAt: new Date().toISOString(),
    sourceFile: meta?.sourceFile ?? 'english_words_with_russian.txt',
    worlds: VOCABULARY_WORLDS,
    levels: VOCABULARY_LEVELS,
    topics: VOCABULARY_TOPICS,
    words,
  }
}

export function filterActiveNecessaryWords(words: NecessaryWord[]): NecessaryWord[] {
  return words.filter((word) => word.status === 'active')
}

export function activeWorldCounts(catalog: NecessaryWordsCatalog): Record<string, number> {
  return countActiveWordsByWorld(catalog.words)
}
