export type FormatLessonErrorFeedbackParams = {
  message: string
  correctAnswer?: string | null
  /** Номер попытки конкретной записи (1, 2, …), не глобальный счётчик шага. */
  attemptNumber: number
}

export type LessonErrorFeedbackParts = {
  hint: string
  repeatAnswer?: string
}

export function formatLessonErrorFeedback(
  params: FormatLessonErrorFeedbackParams
): LessonErrorFeedbackParts {
  const hint = params.message.trim()
  const answer = params.correctAnswer?.trim()
  if (params.attemptNumber < 2 || !answer) {
    return { hint }
  }
  return { hint, repeatAnswer: answer }
}
