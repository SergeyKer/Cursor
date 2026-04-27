import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import type { Exercise } from '@/types/lesson'

function normalizeStrict(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function buildCandidateAnswers(exercise: Exercise): string[] {
  return Array.from(
    new Set([exercise.correctAnswer, ...(exercise.acceptedAnswers ?? [])].map((item) => item.trim()).filter(Boolean))
  )
}

export function validateAnswer(userInput: string, exercise: Exercise): boolean {
  const candidates = buildCandidateAnswers(exercise)
  if (candidates.length === 0) return false

  const answerPolicy =
    exercise.answerPolicy ?? (exercise.type === 'fill_choice' || exercise.type === 'match' || exercise.answerFormat === 'choice' ? 'strict' : 'normalized')

  if (answerPolicy === 'strict' || exercise.type === 'fill_choice' || exercise.type === 'match' || exercise.answerFormat === 'choice') {
    const normalizedInput = normalizeStrict(userInput)
    return candidates.some((candidate) => normalizeStrict(candidate) === normalizedInput)
  }

  const normalizedInput = normalizeEnglishForLearnerAnswerMatch(userInput, 'translation')
  return candidates.some(
    (candidate) => normalizeEnglishForLearnerAnswerMatch(candidate, 'translation') === normalizedInput
  )
}
