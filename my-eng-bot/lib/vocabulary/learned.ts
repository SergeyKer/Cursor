import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

/** Legacy archive threshold (migrate → mastered on load). */
export const STRICT_LEARNED_MIN_STAGE = 4
export const STRICT_LEARNED_MIN_SUCCESSES = 3

export function isWordInProgress(progress: VocabularyWordProgress | undefined): boolean {
  return (progress?.successes ?? 0) > 0 || (progress?.attempts ?? 0) > 0
}

/** Legacy strict criterion — used only for migration heuristics. */
export function isWordStrictlyLearned(progress: VocabularyWordProgress | undefined): boolean {
  if (!progress) return false
  if (progress.feedStatus === 'mastered') return true
  return progress.stage >= STRICT_LEARNED_MIN_STAGE && progress.successes >= STRICT_LEARNED_MIN_SUCCESSES
}

export function isWordMastered(progress: VocabularyWordProgress | undefined): boolean {
  if (!progress) return false
  return progress.feedStatus === 'mastered'
}

export type MasteredWordView = {
  word: NecessaryWord
  lastReviewedAt: number | null
}

export function listMasteredWords(
  words: NecessaryWord[],
  progressMap: Record<string, VocabularyWordProgress>
): MasteredWordView[] {
  const active = words.filter((w) => w.status === 'active')
  const result: MasteredWordView[] = []
  for (const word of active) {
    const progress = progressMap[String(word.id)]
    if (!isWordMastered(progress) && !isWordStrictlyLearned(progress)) continue
    result.push({ word, lastReviewedAt: progress?.lastReviewedAt ?? null })
  }
  result.sort((left, right) => {
    const leftTime = left.lastReviewedAt ?? 0
    const rightTime = right.lastReviewedAt ?? 0
    return rightTime - leftTime
  })
  return result
}

/** @deprecated use listMasteredWords */
export function listStrictlyLearnedWords(
  words: NecessaryWord[],
  progressMap: Record<string, VocabularyWordProgress>
): MasteredWordView[] {
  return listMasteredWords(words, progressMap)
}
