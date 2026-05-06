import type { Exercise } from '@/types/lesson'

/** Разворачивает вариант упражнения урока без зависимости от lesson engine (client hook). */
export function resolveLessonExerciseVariant(exercise: Exercise, variantIndex: number = 0): Exercise {
  const variants = exercise.variants ?? []
  const activeVariant = variants[variantIndex]
  if (!activeVariant) {
    return {
      ...exercise,
      currentVariantIndex: variantIndex,
    }
  }

  return {
    ...exercise,
    question: activeVariant.question ?? exercise.question,
    options: activeVariant.options ?? exercise.options,
    correctAnswer: activeVariant.correctAnswer,
    acceptedAnswers: activeVariant.acceptedAnswers ?? exercise.acceptedAnswers ?? [activeVariant.correctAnswer],
    singleWordCueRu: activeVariant.singleWordCueRu ?? exercise.singleWordCueRu,
    hint: activeVariant.hint ?? exercise.hint,
    answerFormat: activeVariant.answerFormat ?? exercise.answerFormat,
    answerPolicy: activeVariant.answerPolicy ?? exercise.answerPolicy,
    currentVariantIndex: variantIndex,
    variants: exercise.variants,
    adaptive: exercise.adaptive,
    difficultyProfile: exercise.difficultyProfile,
    puzzleVariants: exercise.puzzleVariants,
    bonusXp: exercise.bonusXp,
    type: exercise.type,
  }
}
