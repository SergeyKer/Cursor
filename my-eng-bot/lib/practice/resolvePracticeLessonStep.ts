import { inferChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import { getReferenceExerciseChallengeStep } from '@/lib/practice/referenceExerciseOptions'
import { resolveLessonExerciseVariant } from '@/lib/practice/resolveLessonExerciseVariant'
import { resolveCanonicalChoiceOptions } from '@/lib/practice/lessonChoicePool'
import type { Exercise, LessonData, LessonStep } from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode } from '@/types/practice'

export type ResolvedPracticeLessonStep = {
  step: LessonStep
  exercise: Exercise
  sourceStepNumber: number
  canonicalOptions: string[]
  variantIndex?: number
}

function getExerciseSteps(lesson: LessonData): Array<{ step: LessonStep; exercise: Exercise }> {
  return lesson.steps
    .filter((step) => step.stepType !== 'completion' && step.exercise)
    .map((step) => ({ step, exercise: step.exercise as Exercise }))
}

function exerciseHasSentenceOptions(exercise: Exercise): boolean {
  return (exercise.options ?? []).some((option) => inferChoiceGranularity({ targetAnswer: option }) === 'sentence')
}

function isExerciseCompatibleWithPracticeType(
  practiceType: PracticeExerciseType,
  exercise: Exercise
): boolean {
  switch (practiceType) {
    case 'context-clue':
      if (exercise.type === 'sentence_puzzle') return false
      if (exercise.type === 'fill_text') return true
      if (exercise.type === 'translate') return exercise.answerFormat === 'full_sentence' || !exercise.answerFormat
      if (exercise.type === 'fill_choice') return exerciseHasSentenceOptions(exercise) || Boolean(exercise.options?.length)
      return Boolean(exercise.options?.length)
    case 'choice':
      return exercise.type === 'fill_choice' && (exercise.options?.length ?? 0) >= 2
    case 'dropdown-fill':
      return (
        exercise.type === 'fill_text' ||
        (exercise.type === 'fill_choice' && (exercise.question?.includes('___') || exercise.options?.length))
      )
    case 'listening-select':
    case 'speed-round':
      return Boolean(exercise.options?.length) || exercise.type === 'fill_choice' || exercise.type === 'translate'
    case 'sentence-surgery':
      return exercise.type === 'sentence_puzzle'
    case 'free-response':
      return exercise.type === 'translate' || exercise.type === 'write_own'
    default:
      return true
  }
}

function findCompatibleStep(
  sourceSteps: Array<{ step: LessonStep; exercise: Exercise }>,
  startIndex: number,
  practiceType: PracticeExerciseType
): { step: LessonStep; exercise: Exercise } | null {
  if (sourceSteps.length === 0) return null
  const base = sourceSteps[startIndex % sourceSteps.length]!
  if (isExerciseCompatibleWithPracticeType(practiceType, base.exercise)) return base

  for (let offset = 1; offset < sourceSteps.length; offset += 1) {
    const forward = sourceSteps[(startIndex + offset) % sourceSteps.length]
    if (forward && isExerciseCompatibleWithPracticeType(practiceType, forward.exercise)) return forward
    const backward = sourceSteps[(startIndex - offset + sourceSteps.length) % sourceSteps.length]
    if (backward && isExerciseCompatibleWithPracticeType(practiceType, backward.exercise)) return backward
  }

  return base
}

function canonicalOptionsForExercise(
  lesson: LessonData,
  exercise: Exercise,
  targetAnswer: string
): string[] {
  return resolveCanonicalChoiceOptions(lesson, exercise, targetAnswer)
}

export function resolvePracticeLessonStep(params: {
  lesson: LessonData
  practiceIndex: number
  practiceType: PracticeExerciseType
  mode: PracticeMode
  referenceExerciseType?: PracticeExerciseType
}): ResolvedPracticeLessonStep | null {
  const sourceSteps = getExerciseSteps(params.lesson)
  if (sourceSteps.length === 0) return null

  let stepIndex = params.practiceIndex % sourceSteps.length
  if (params.referenceExerciseType) {
    const challengeStep = getReferenceExerciseChallengeStep(params.referenceExerciseType)
    if (challengeStep > 0) {
      stepIndex = Math.min(challengeStep - 1, sourceSteps.length - 1)
    }
  }

  const matched = findCompatibleStep(sourceSteps, stepIndex, params.practiceType)
  if (!matched) return null

  const variantCount = matched.exercise.variants?.length ?? 0
  const variantIndex = variantCount > 0 ? params.practiceIndex % variantCount : undefined
  const exercise =
    variantCount > 0 ? resolveLessonExerciseVariant(matched.exercise, variantIndex ?? 0) : matched.exercise

  return {
    step: matched.step,
    exercise,
    sourceStepNumber: matched.step.stepNumber,
    canonicalOptions: canonicalOptionsForExercise(
      params.lesson,
      exercise,
      exercise.correctAnswer
    ),
    variantIndex,
  }
}
