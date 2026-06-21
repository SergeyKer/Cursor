import type { Audience } from '@/lib/types'
import type { ExerciseType } from '@/types/lesson'

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

export type ResolveLessonRepeatInstructionVerbParams = {
  exerciseType?: ExerciseType | null
  hasChoiceOptions?: boolean
  hasMicrophone?: boolean
  audience?: Audience
}

/** Глагол в зелёной подсказке «…: ответ» после 2-й ошибки на шаге. */
export function resolveLessonRepeatInstructionVerb(
  params: ResolveLessonRepeatInstructionVerbParams
): string {
  const child = params.audience === 'child'
  const isChoice =
    params.hasChoiceOptions ||
    params.exerciseType === 'fill_choice' ||
    params.exerciseType === 'micro_quiz'
  if (isChoice) return child ? 'Выбери' : 'Выберите'
  if (params.hasMicrophone) return child ? 'Скажи' : 'Скажите'
  return child ? 'Напиши' : 'Напишите'
}
