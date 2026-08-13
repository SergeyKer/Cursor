import { loadActiveNecessaryWords } from '@/lib/vocabulary/catalogCache'
import { pickVocabFuelDefault } from '@/lib/vocabulary/fuel'
import { loadVocabularyProgress } from '@/lib/vocabulary/storage'
import type { VocabularyFocusLemma } from '@/types/vocabulary'

export async function resolveSmartMixFocusLemmas(params?: {
  pushLemmas?: VocabularyFocusLemma[]
  n?: number
  now?: number
}): Promise<VocabularyFocusLemma[]> {
  const words = await loadActiveNecessaryWords()
  const progress = loadVocabularyProgress()
  return pickVocabFuelDefault({
    words,
    progressMap: progress.words,
    n: params?.n ?? 3,
    pushLemmas: params?.pushLemmas,
  })
}

export function describeSmartMixLine(lemmas: VocabularyFocusLemma[]): string {
  if (lemmas.length === 0) return 'Смесь пуста'
  return lemmas.map((lemma) => lemma.en).join(' · ')
}
