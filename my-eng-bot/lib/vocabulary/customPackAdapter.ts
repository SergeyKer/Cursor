import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type { CustomWordItem, CustomWordPack } from '@/types/adaptiveRetention'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

export type PackAdaptContext = {
  catalog?: NecessaryWord[]
  progressMap?: Record<string, VocabularyWordProgress>
}

function hashToPositiveInt(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  const abs = Math.abs(hash)
  return abs === 0 ? 1 : abs
}

export function lemmaWordId(lemmaKey: string): number {
  return hashToPositiveInt(`custom-lemma:${lemmaKey}`)
}

export function resolvePackWordId(
  en: string,
  context: PackAdaptContext = {}
): number {
  const key = lemmaKeyFromEn(en)
  const catalogHits = (context.catalog ?? []).filter((word) => lemmaKeyFromEn(word.en) === key)
  if (catalogHits.length === 1 && catalogHits[0]) return catalogHits[0].id
  const existing = Object.values(context.progressMap ?? {}).find((row) => (row.lemmaKey ?? '') === key)
  if (existing) return existing.wordId
  return lemmaWordId(key)
}

export function customPackItemToNecessaryWord(
  item: CustomWordItem,
  packId: string,
  context: PackAdaptContext = {}
): NecessaryWord {
  return {
    id: resolvePackWordId(item.en, context),
    en: item.en,
    ru: item.ru,
    transcription: '',
    source: `pack:${packId}`,
    tags: ['custom-pack'],
    status: 'active',
    primaryWorld: 'core',
    primaryLevel: 'a2',
    primaryVocabularyTopic: 'core',
  }
}

export function customPackToNecessaryWords(pack: CustomWordPack, context: PackAdaptContext = {}): NecessaryWord[] {
  return pack.items.map((item) => customPackItemToNecessaryWord(item, pack.id, context))
}
