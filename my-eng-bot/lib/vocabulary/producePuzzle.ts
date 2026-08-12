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

export function produceTargetLength(targetEn: string): number {
  return targetEn.trim().length
}

export function isProduceFilled(selected: string[], targetEn: string): boolean {
  return selected.length === produceTargetLength(targetEn)
}

export type ProduceAssemblyState = {
  tiles: string[]
  selected: string[]
}

/** Append letter from bank into slots; no-op when already filled or index invalid. */
export function selectProduceLetter(
  tiles: string[],
  selected: string[],
  letter: string,
  tileIndex: number,
  targetLen: number
): ProduceAssemblyState {
  if (selected.length >= targetLen) return { tiles, selected }
  if (tileIndex < 0 || tileIndex >= tiles.length) return { tiles, selected }
  if (tiles[tileIndex] !== letter) return { tiles, selected }
  return {
    tiles: tiles.filter((_, index) => index !== tileIndex),
    selected: [...selected, letter],
  }
}

/** Return letter from slot back to end of bank; no-op on bad index. */
export function returnProduceLetter(
  tiles: string[],
  selected: string[],
  slotIndex: number
): ProduceAssemblyState {
  if (slotIndex < 0 || slotIndex >= selected.length) return { tiles, selected }
  const letter = selected[slotIndex]
  if (letter === undefined) return { tiles, selected }
  return {
    tiles: [...tiles, letter],
    selected: selected.filter((_, index) => index !== slotIndex),
  }
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
