import type { PracticeAnswer, PracticeQuestion } from '@/types/practice'

export function resolvePracticeRepeatAnswer(params: {
  answer: PracticeAnswer
  attemptNumber: number
  questionType: PracticeQuestion['type']
}): string | undefined {
  if (params.answer.isCorrect) return undefined
  if (params.questionType !== 'choice') return undefined
  if (params.attemptNumber < 1 || params.attemptNumber > 2) return undefined

  const tone = params.answer.feedbackTone ?? 'error'
  if (tone !== 'error') return undefined

  const answer = params.answer.correctAnswer?.trim()
  return answer || undefined
}
