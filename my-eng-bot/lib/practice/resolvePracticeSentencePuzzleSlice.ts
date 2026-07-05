import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import type { Exercise, SentencePuzzleVariant } from '@/types/lesson'

export const DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT = 'Расставьте слова в правильном порядке.'

const MULTI_PUZZLE_PROMPT = /три\s+(предложен|фраз)/i

export type PracticeSentencePuzzleSlice = {
  targetAnswer: string
  acceptedAnswers: string[]
  wordTokens: string[]
  prompt: string
  hint?: string
  matchedVariant?: SentencePuzzleVariant
}

export function isStaleLessonPuzzlePrompt(text: string): boolean {
  return MULTI_PUZZLE_PROMPT.test(text.trim())
}

function answersMatch(left: string, right: string): boolean {
  const a = normalizeEnglishForLearnerAnswerMatch(left, 'translation')
  const b = normalizeEnglishForLearnerAnswerMatch(right, 'translation')
  return a.length > 0 && a === b
}

function getVariantWordTokens(variant: SentencePuzzleVariant): string[] {
  const order = variant.correctOrder.length > 0 ? variant.correctOrder : variant.words
  return order.map((word) => word.trim()).filter(Boolean)
}

function mergeAcceptedAnswers(variant: SentencePuzzleVariant, exercise: Exercise): string[] {
  const candidates = [
    variant.correctAnswer,
    ...(exercise.acceptedAnswers ?? []),
    exercise.correctAnswer,
  ]
    .map((item) => item.trim())
    .filter(Boolean)

  const unique: string[] = []
  for (const candidate of candidates) {
    if (unique.some((existing) => answersMatch(existing, candidate))) continue
    unique.push(candidate)
  }
  return unique
}

export function findMatchingPuzzleVariant(
  exercise: Exercise,
  targetAnswer?: string
): SentencePuzzleVariant | null {
  const variants = exercise.puzzleVariants ?? []
  if (variants.length === 0) return null

  const answerKeys = [
    ...(targetAnswer ? [targetAnswer] : []),
    exercise.correctAnswer,
    ...(exercise.acceptedAnswers ?? []),
  ]
    .map((item) => item.trim())
    .filter(Boolean)

  for (const variant of variants) {
    if (answerKeys.some((key) => answersMatch(key, variant.correctAnswer))) {
      return variant
    }
  }

  return variants[variants.length - 1] ?? null
}

export function resolvePracticeSentencePuzzleSlice(exercise: Exercise): PracticeSentencePuzzleSlice | null {
  if (exercise.type !== 'sentence_puzzle') return null
  const variant = findMatchingPuzzleVariant(exercise)
  if (!variant) return null

  const acceptedAnswers = mergeAcceptedAnswers(variant, exercise)
  const targetAnswer = acceptedAnswers[0] ?? variant.correctAnswer
  const instruction = variant.instruction.trim()
  const prompt =
    instruction && !isStaleLessonPuzzlePrompt(instruction)
      ? instruction
      : DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT
  const hintText = variant.hintText.trim()

  return {
    targetAnswer,
    acceptedAnswers,
    wordTokens: getVariantWordTokens(variant),
    prompt,
    hint: hintText || undefined,
    matchedVariant: variant,
  }
}
