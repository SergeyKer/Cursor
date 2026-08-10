import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import type { VocabularyWordProgress } from '@/types/vocabulary'
import { SRS_INTERVAL_DAYS } from '@/lib/vocabulary/srs'

/** Letters for EN lemma (spaces kept as separate tiles). */
export function scrambleProduceLetters(en: string, rng: () => number = Math.random): string[] {
  const chars = en.trim().split('')
  if (chars.length <= 1) return chars
  const copy = [...chars]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  // Avoid identical order when possible
  if (copy.join('') === en.trim() && copy.length > 2) {
    ;[copy[0], copy[1]] = [copy[1]!, copy[0]!]
  }
  return copy
}

export function produceAccept(guess: string, targetEn: string): boolean {
  const a = normalizeEnglishForLearnerAnswerMatch(guess, 'translation')
  const b = normalizeEnglishForLearnerAnswerMatch(targetEn, 'translation')
  return Boolean(a && b && a === b)
}

/** Produce success +1 stage; fail −2 (clamped). Does not gate bank. */
export function applyProduceResult(
  progress: VocabularyWordProgress,
  wasCorrect: boolean,
  now: number = Date.now()
): VocabularyWordProgress {
  const nextStage = wasCorrect
    ? Math.min(progress.stage + 1, SRS_INTERVAL_DAYS.length - 1)
    : Math.max(0, progress.stage - 2)
  const nextIntervalDays = SRS_INTERVAL_DAYS[nextStage] ?? 0
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
