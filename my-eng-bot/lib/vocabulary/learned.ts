import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

/** Минимальный стадийный порог для «архива выученных» и исключения из новых сессий SRS. */
export const STRICT_LEARNED_MIN_STAGE = 4
/** Минимум верных ответов в квизе (накопительно). */
export const STRICT_LEARNED_MIN_SUCCESSES = 3

export function isWordInProgress(progress: VocabularyWordProgress | undefined): boolean {
  return (progress?.successes ?? 0) > 0
}

export function isWordStrictlyLearned(progress: VocabularyWordProgress | undefined): boolean {
  if (!progress) return false
  return progress.stage >= STRICT_LEARNED_MIN_STAGE && progress.successes >= STRICT_LEARNED_MIN_SUCCESSES
}

export type StrictlyLearnedWordView = {
  word: NecessaryWord
  lastReviewedAt: number | null
}

export function listStrictlyLearnedWords(
  words: NecessaryWord[],
  progressMap: Record<string, VocabularyWordProgress>
): StrictlyLearnedWordView[] {
  const active = words.filter((w) => w.status === 'active')
  const result: StrictlyLearnedWordView[] = []
  for (const word of active) {
    const progress = progressMap[String(word.id)]
    if (!isWordStrictlyLearned(progress)) continue
    result.push({ word, lastReviewedAt: progress?.lastReviewedAt ?? null })
  }
  result.sort((left, right) => {
    const leftTime = left.lastReviewedAt ?? 0
    const rightTime = right.lastReviewedAt ?? 0
    return rightTime - leftTime
  })
  return result
}
