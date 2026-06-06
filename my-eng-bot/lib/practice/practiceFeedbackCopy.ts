import type { Audience } from '@/lib/types'

const WRONG_MARKER = '🔴'

export function buildPracticeWrongAnswerFeedback(params: {
  correctAnswer: string
  attemptNumber: 1 | 2
  audience?: Audience
}): string {
  const answer = params.correctAnswer.trim()
  if (params.attemptNumber === 1) {
    return `${WRONG_MARKER} Неверно. Правильно: ${answer}`
  }
  const retryLead = params.audience === 'child' ? 'Давай ещё раз' : 'Попробуйте ещё раз'
  return `${WRONG_MARKER} Неверно. ${retryLead}: ${answer}`
}
