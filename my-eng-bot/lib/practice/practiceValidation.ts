import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import type { PracticeQuestion } from '@/types/practice'

function normalizeStrict(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function wordCount(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function validatePracticeAnswer(userInput: string, question: PracticeQuestion): boolean {
  const candidates = [question.targetAnswer, ...question.acceptedAnswers].map((item) => item.trim()).filter(Boolean)
  if (candidates.length === 0) return false

  if (question.tolerance === 'strict' || question.options?.length) {
    const normalizedInput = normalizeStrict(userInput)
    return candidates.some((candidate) => normalizeStrict(candidate) === normalizedInput)
  }

  const normalizedInput = normalizeEnglishForLearnerAnswerMatch(userInput, 'translation')
  const exactNormalizedMatch = candidates.some(
    (candidate) => normalizeEnglishForLearnerAnswerMatch(candidate, 'translation') === normalizedInput
  )
  if (exactNormalizedMatch) return true

  if (question.tolerance !== 'soft') return false

  const enoughWords = question.minWords ? wordCount(userInput) >= question.minWords : wordCount(userInput) >= 3
  if (!enoughWords) return false
  const keywords = question.keywords?.map((keyword) => normalizeStrict(keyword)).filter(Boolean) ?? []
  if (keywords.length === 0) return true
  const normalizedStrictInput = normalizeStrict(userInput)
  return keywords.some((keyword) => normalizedStrictInput.includes(keyword))
}
