import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { validateBossChallengeAnswer } from '@/lib/practice/bossChallengeAnswerValidation'
import { validateRoleplayAnswer } from '@/lib/practice/roleplayAnswerValidation'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { PracticeQuestion } from '@/types/practice'

export type PracticeAnswerValidationContext = 'chip' | 'typed' | 'correction'

function normalizeStrict(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function wordCount(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function validatePracticeAnswer(
  userInput: string,
  question: PracticeQuestion,
  context: PracticeAnswerValidationContext = 'typed'
): boolean {
  const candidates = [question.targetAnswer, ...question.acceptedAnswers].map((item) => item.trim()).filter(Boolean)
  if (candidates.length === 0) return false

  const useStrictMatch =
    context === 'chip' && (question.tolerance === 'strict' || Boolean(question.options?.length))

  if (useStrictMatch) {
    const normalizedInput = normalizeStrict(userInput)
    return candidates.some((candidate) => normalizeStrict(candidate) === normalizedInput)
  }

  const normalizedInput = normalizeEnglishForLearnerAnswerMatch(userInput, 'translation')
  const exactNormalizedMatch = candidates.some(
    (candidate) => normalizeEnglishForLearnerAnswerMatch(candidate, 'translation') === normalizedInput
  )
  if (exactNormalizedMatch) return true

  // Boss correction ("Скажи"): only etalon match — no pattern-soft.
  if (context === 'correction' && question.type === 'boss-challenge') {
    return false
  }

  if (question.type === 'boss-challenge') {
    const lesson = getStructuredLessonById(question.lessonId)
    if (lesson) return validateBossChallengeAnswer(userInput, question, lesson)
  }

  if (question.type === 'roleplay-mini') {
    const lesson = getStructuredLessonById(question.lessonId)
    if (lesson) return validateRoleplayAnswer(userInput, question, lesson)
  }

  if (context === 'correction') {
    // Non-boss correction keeps typed soft path below when tolerance is soft.
  }

  if (question.tolerance !== 'soft') return false

  const enoughWords = question.minWords ? wordCount(userInput) >= question.minWords : wordCount(userInput) >= 3
  if (!enoughWords) return false
  const keywords = question.keywords?.map((keyword) => normalizeStrict(keyword)).filter(Boolean) ?? []
  if (keywords.length === 0) return true
  const normalizedStrictInput = normalizeStrict(userInput)
  return keywords.some((keyword) => normalizedStrictInput.includes(keyword))
}
