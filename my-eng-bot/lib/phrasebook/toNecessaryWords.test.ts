import { describe, expect, it } from 'vitest'
import { phrasebookFallbackId, resolvePhrasebookWords } from '@/lib/phrasebook/toNecessaryWords'
import { PHRASEBOOK_TOPICS } from '@/lib/phrasebook/topics'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type { NecessaryWord } from '@/types/vocabulary'

function catalogWord(id: number, en: string): NecessaryWord {
  return {
    id,
    en,
    ru: `ru-${en}`,
    transcription: 'x',
    source: 'catalog',
    tags: [],
    status: 'active',
    primaryWorld: 'core',
    primaryLevel: 'a1',
    primaryVocabularyTopic: 'core',
  }
}

describe('resolvePhrasebookWords', () => {
  it('keeps ten topics with about twenty lemmas', () => {
    expect(PHRASEBOOK_TOPICS).toHaveLength(10)
    for (const topic of PHRASEBOOK_TOPICS) {
      expect(topic.lemmas.length).toBeGreaterThanOrEqual(18)
      expect(topic.lemmas.length).toBeLessThanOrEqual(22)
    }
  })

  it('reuses catalog id when lemma matches', () => {
    const catalog = [catalogWord(42, 'hello'), catalogWord(7, 'please')]
    const words = resolvePhrasebookWords('meet', catalog)
    const hello = words.find((word) => lemmaKeyFromEn(word.en) === 'hello')
    const please = words.find((word) => lemmaKeyFromEn(word.en) === 'please')
    expect(hello?.id).toBe(42)
    expect(please?.id).toBe(7)
    expect(hello?.transcription).toBe('x')
  })

  it('uses stable fallback ids when catalog misses', () => {
    const words = resolvePhrasebookWords('meet', [])
    expect(words[0]?.id).toBe(phrasebookFallbackId('meet', 0))
    expect(resolvePhrasebookWords('meet', [])[3]?.id).toBe(words[3]?.id)
  })
})
