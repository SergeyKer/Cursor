import { loadActiveNecessaryWords } from '@/lib/vocabulary/catalogCache'
import { vocabMistakeLemmaKeys } from '@/lib/vocabulary/mistakesList'
import { loadVocabularyProgress } from '@/lib/vocabulary/storage'
import { pickFocusLemmasForMode } from '@/lib/vocabulary/wordFeed'
import type { VocabularyFocusLemma } from '@/types/vocabulary'

export async function resolveSmartMixFocusLemmas(params?: {
  pushLemmas?: VocabularyFocusLemma[]
  n?: number
  now?: number
}): Promise<VocabularyFocusLemma[]> {
  const words = await loadActiveNecessaryWords()
  const progress = loadVocabularyProgress()
  return pickFocusLemmasForMode({
    words,
    progressMap: progress.words,
    n: params?.n ?? 3,
    now: params?.now,
    pushLemmas: params?.pushLemmas,
    mistakeLemmaKeys: vocabMistakeLemmaKeys(),
  })
}

export function describeSmartMixLine(lemmas: VocabularyFocusLemma[]): string {
  if (lemmas.length === 0) return 'Смесь пуста'
  return lemmas.map((lemma) => lemma.en).join(' · ')
}
