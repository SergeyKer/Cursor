import type { ExerciseVariant, LessonAnswerPolicy } from '@/types/lesson'

export type Step6ExamVariantInput = {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  correctAnswer: string
  acceptedAnswers?: string[]
  hint: string
  answerPolicy?: LessonAnswerPolicy
}

export function buildStep6ExamVariants(items: Step6ExamVariantInput[]): ExerciseVariant[] {
  return items.map((item) => ({
    id: item.id,
    question: item.question,
    correctAnswer: item.correctAnswer,
    acceptedAnswers: item.acceptedAnswers ?? [item.correctAnswer],
    hint: item.hint,
    difficulty: item.difficulty,
    answerFormat: 'full_sentence' as const,
    answerPolicy: item.answerPolicy ?? 'normalized',
  }))
}
