import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type { NecessaryWord } from '@/types/vocabulary'
import {
  DEFAULT_PHRASEBOOK_TOPIC_ID,
  getPhrasebookTopic,
  PHRASEBOOK_TOPIC_IDS,
  type PhrasebookTopicId,
} from '@/lib/phrasebook/topics'

/** Stable ids outside necessary-words / hashed custom packs. */
export const PHRASEBOOK_ID_BASE = 900_000

export function phrasebookFallbackId(topicId: PhrasebookTopicId, lemmaIndex: number): number {
  const topicIndex = PHRASEBOOK_TOPIC_IDS.indexOf(topicId)
  const safeTopic = topicIndex < 0 ? 0 : topicIndex
  return PHRASEBOOK_ID_BASE + safeTopic * 50 + lemmaIndex
}

export function resolvePhrasebookWords(
  topicId: PhrasebookTopicId,
  catalog: NecessaryWord[]
): NecessaryWord[] {
  const topic = getPhrasebookTopic(topicId)
  const byLemma = new Map<string, NecessaryWord>()
  for (const word of catalog) {
    if (word.status !== 'active') continue
    const key = lemmaKeyFromEn(word.en)
    if (!byLemma.has(key)) byLemma.set(key, word)
  }

  return topic.lemmas.map((lemma, index) => {
    const hit = byLemma.get(lemmaKeyFromEn(lemma.en))
    if (hit) return hit
    return {
      id: phrasebookFallbackId(topicId, index),
      en: lemma.en,
      ru: lemma.ru,
      transcription: '',
      source: `phrasebook:${topicId}`,
      tags: ['phrasebook', topicId],
      status: 'active',
      primaryWorld: 'core',
      primaryLevel: 'a1',
      primaryVocabularyTopic: 'core',
    }
  })
}

export function resolveActivePhrasebookWords(
  topicId: PhrasebookTopicId | null | undefined,
  catalog: NecessaryWord[]
): NecessaryWord[] {
  return resolvePhrasebookWords(topicId ?? DEFAULT_PHRASEBOOK_TOPIC_ID, catalog)
}
