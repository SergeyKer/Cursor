import { initialStatusForWord } from '@/lib/vocabulary/cleanupRules'
import { countActiveWordsByWorld, inferWorlds, VOCABULARY_WORLDS } from '@/lib/vocabulary/worlds'
import type { NecessaryWord, NecessaryWordsCatalog, ParsedNecessaryWord } from '@/types/vocabulary'

export function buildNecessaryWordsCatalog(sourceWords: ParsedNecessaryWord[]): NecessaryWordsCatalog {
  const words: NecessaryWord[] = sourceWords.map((word) => {
    const status = initialStatusForWord(word.id)
    const { primaryWorld, secondaryWorld, tags } = inferWorlds(word)

    return {
      ...word,
      status,
      tags,
      primaryWorld,
      ...(secondaryWorld ? { secondaryWorld } : {}),
    }
  })

  return {
    dictionaryVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceFile: 'english_words_with_russian.txt',
    worlds: VOCABULARY_WORLDS,
    words,
  }
}

export function filterActiveNecessaryWords(words: NecessaryWord[]): NecessaryWord[] {
  return words.filter((word) => word.status === 'active')
}

export function activeWorldCounts(catalog: NecessaryWordsCatalog): Record<string, number> {
  return countActiveWordsByWorld(catalog.words)
}
