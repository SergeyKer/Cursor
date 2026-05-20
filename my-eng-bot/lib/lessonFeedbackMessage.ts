export type FormatLessonErrorFeedbackParams = {
  message: string
  correctAnswer?: string | null
  exerciseErrors: number
}

export function formatLessonErrorFeedback(params: FormatLessonErrorFeedbackParams): string {
  const message = params.message.trim()
  const answer = params.correctAnswer?.trim()
  if (params.exerciseErrors < 2 || !answer) {
    return message
  }
  return `${message}\nСкажи: ${answer}`.trim()
}
