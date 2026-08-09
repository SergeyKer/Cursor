import type { CustomWordItem, CustomWordPack } from '@/types/adaptiveRetention'
import type { NecessaryWord } from '@/types/vocabulary'

function hashToPositiveInt(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  const abs = Math.abs(hash)
  return abs === 0 ? 1 : abs
}

export function customPackItemToNecessaryWord(item: CustomWordItem, packId: string): NecessaryWord {
  return {
    id: hashToPositiveInt(`${packId}:${item.id}:${item.en}`),
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

export function customPackToNecessaryWords(pack: CustomWordPack): NecessaryWord[] {
  return pack.items.map((item) => customPackItemToNecessaryWord(item, pack.id))
}
