import { buildReferenceFallbackQuestions } from '@/lib/practice/referenceFallbackQuestion'
import { PRACTICE_REFERENCE_COPY } from '@/lib/uiCopy/practiceCopy'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeQuestion } from '@/types/practice'

const REFERENCE_TOTAL = 7

export function resolveLocalReferencePracticeQuestions(params: {
  lesson: LessonData
  referenceExerciseType?: PracticeExerciseType
}): { questions: PracticeQuestion[] } | { error: string } {
  if (!params.referenceExerciseType) {
    return { error: PRACTICE_REFERENCE_COPY.selectExerciseType }
  }

  const questions = buildReferenceFallbackQuestions({
    lesson: params.lesson,
    referenceExerciseType: params.referenceExerciseType,
    referenceTotal: REFERENCE_TOTAL,
  })

  if (questions.length === 0) {
    return { error: PRACTICE_REFERENCE_COPY.cannotBuildLocal }
  }

  return { questions }
}
