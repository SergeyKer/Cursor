import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const

export function createEmptyWordProgress(wordId: number): VocabularyWordProgress {
  return {
    wordId,
    stage: 0,
    attempts: 0,
    successes: 0,
    failures: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
  }
}

export function applyVocabularyReview(
  progress: VocabularyWordProgress,
  wasCorrect: boolean,
  now: number = Date.now()
): VocabularyWordProgress {
  const nextStage = wasCorrect
    ? Math.min(progress.stage + 1, SRS_INTERVAL_DAYS.length - 1)
    : 0
  const nextIntervalDays = SRS_INTERVAL_DAYS[nextStage]

  return {
    ...progress,
    stage: nextStage,
    attempts: progress.attempts + 1,
    successes: progress.successes + (wasCorrect ? 1 : 0),
    failures: progress.failures + (wasCorrect ? 0 : 1),
    lastReviewedAt: now,
    nextReviewAt: now + nextIntervalDays * 24 * 60 * 60 * 1000,
  }
}

export function isWordDue(progress: VocabularyWordProgress | null | undefined, now: number = Date.now()): boolean {
  if (!progress?.nextReviewAt) return true
  return progress.nextReviewAt <= now
}

export function buildWorldSessionWords(params: {
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  size?: number
  now?: number
}): NecessaryWord[] {
  const size = params.size ?? 5
  const now = params.now ?? Date.now()
  const dueWords = params.words.filter((word) => isWordDue(params.progressMap[String(word.id)], now))
  const freshWords = dueWords.filter((word) => !params.progressMap[String(word.id)]?.attempts)
  const reviewWords = dueWords.filter((word) => params.progressMap[String(word.id)]?.attempts)

  const result: NecessaryWord[] = []
  for (const bucket of [reviewWords, freshWords, params.words]) {
    for (const word of bucket) {
      if (result.length >= size) break
      if (result.some((item) => item.id === word.id)) continue
      result.push(word)
    }
  }

  return result.slice(0, size)
}
