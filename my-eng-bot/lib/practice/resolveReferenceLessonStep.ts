import { lessonForPracticeStep, pickVariantProfileForStep } from '@/lib/practice/buildPracticeDiversity'
import { getPreferredStepNumbers, type PracticePromptAxis, type PracticePromptSlot } from '@/lib/practice/prompt/promptSourceTypes'
import { isExerciseCompatibleWithPracticeType } from '@/lib/practice/practiceStepCompatibility'
import { resolveCanonicalChoiceOptions } from '@/lib/practice/lessonChoicePool'
import { resolveLessonExerciseVariant } from '@/lib/practice/resolveLessonExerciseVariant'
import type { Exercise, LessonData, LessonStep } from '@/types/lesson'
import type { PracticeExerciseType } from '@/types/practice'

export type ResolvedReferenceLessonStep = {
  step: LessonStep
  exercise: Exercise
  sourceStepNumber: number
  canonicalOptions: string[]
  variantIndex?: number
  variantProfileId?: string
  axis?: PracticePromptAxis
}

function getExerciseSteps(lesson: LessonData): Array<{ step: LessonStep; exercise: Exercise }> {
  return lesson.steps
    .filter((step) => step.stepType !== 'completion' && step.exercise)
    .map((step) => ({ step, exercise: step.exercise as Exercise }))
}

function findStepByNumber(
  lesson: LessonData,
  stepNumber: number
): { step: LessonStep; exercise: Exercise } | null {
  const match = lesson.steps.find((step) => step.stepNumber === stepNumber && step.exercise)
  if (!match?.exercise) return null
  return { step: match, exercise: match.exercise as Exercise }
}

function findCompatibleStep(
  lesson: LessonData,
  practiceType: PracticeExerciseType,
  preferredNumbers: readonly number[]
): { step: LessonStep; exercise: Exercise } | null {
  for (const stepNumber of preferredNumbers) {
    const match = findStepByNumber(lesson, stepNumber)
    if (match && isExerciseCompatibleWithPracticeType(practiceType, match.exercise)) {
      return match
    }
  }

  const sourceSteps = getExerciseSteps(lesson)
  for (const preferred of preferredNumbers) {
    const index = sourceSteps.findIndex((item) => item.step.stepNumber === preferred)
    if (index < 0) continue
    for (let offset = 0; offset < sourceSteps.length; offset += 1) {
      const candidate = sourceSteps[(index + offset) % sourceSteps.length]
      if (candidate && isExerciseCompatibleWithPracticeType(practiceType, candidate.exercise)) {
        return candidate
      }
    }
  }

  for (const candidate of sourceSteps) {
    if (isExerciseCompatibleWithPracticeType(practiceType, candidate.exercise)) {
      return candidate
    }
  }

  return sourceSteps[0] ?? null
}

function resolveFreeResponseAxis(stepNumber: number, variantIndex: number): PracticePromptAxis {
  if (stepNumber === 4) return 'state'
  if (variantIndex === 0) return 'state'
  if (variantIndex === 1) return 'action'
  return 'creative'
}

function resolveSlotForType(
  referenceExerciseType: PracticeExerciseType,
  stepIndex: number
): PracticePromptSlot {
  const preferred = getPreferredStepNumbers(referenceExerciseType)

  if (referenceExerciseType === 'free-response') {
    const useStepFour = stepIndex % 2 === 0
    return {
      profileIndex: stepIndex,
      stepNumber: useStepFour ? 4 : 6,
      variantIndex: Math.floor(stepIndex / 2) % 3,
      axis: useStepFour ? 'state' : undefined,
    }
  }

  if (referenceExerciseType === 'boss-challenge') {
    return {
      profileIndex: stepIndex,
      stepNumber: 6,
      variantIndex: 2,
      axis: 'creative',
    }
  }

  const stepNumber = preferred[stepIndex % preferred.length] ?? preferred[0] ?? 3
  return {
    profileIndex: stepIndex,
    stepNumber,
    variantIndex: stepIndex % 3,
  }
}

function canonicalOptionsForExercise(lesson: LessonData, exercise: Exercise, targetAnswer: string): string[] {
  return resolveCanonicalChoiceOptions(lesson, exercise, targetAnswer)
}

export function collectReferencePromptSlots(
  lesson: LessonData,
  referenceExerciseType: PracticeExerciseType,
  maxSlots = 12
): PracticePromptSlot[] {
  const profiles = lesson.repeatConfig?.variantProfiles ?? []
  const profileCount = Math.max(profiles.length, 1)
  const slots: PracticePromptSlot[] = []

  for (let index = 0; index < maxSlots; index += 1) {
    const base = resolveSlotForType(referenceExerciseType, index)
    slots.push({
      ...base,
      profileIndex: index % profileCount,
      variantIndex: Math.floor(index / profileCount) % 3,
    })
  }

  return slots
}

export function resolveReferenceLessonStep(params: {
  lesson: LessonData
  referenceExerciseType: PracticeExerciseType
  stepIndex: number
}): ResolvedReferenceLessonStep | null {
  const slot = resolveSlotForType(params.referenceExerciseType, params.stepIndex)
  const scopedLesson = lessonForPracticeStep(params.lesson, slot.profileIndex)
  const profile = pickVariantProfileForStep(params.lesson, slot.profileIndex)
  const preferred = getPreferredStepNumbers(params.referenceExerciseType)
  const matched = findCompatibleStep(scopedLesson, params.referenceExerciseType, [
    slot.stepNumber,
    ...preferred.filter((n) => n !== slot.stepNumber),
  ])
  if (!matched) return null

  const variantCount = matched.exercise.variants?.length ?? 0
  const variantIndex = variantCount > 0 ? slot.variantIndex % variantCount : undefined
  const exercise =
    variantCount > 0 ? resolveLessonExerciseVariant(matched.exercise, variantIndex ?? 0) : matched.exercise

  let axis = slot.axis
  if (params.referenceExerciseType === 'free-response') {
    axis = resolveFreeResponseAxis(matched.step.stepNumber, variantIndex ?? 0)
  } else if (params.referenceExerciseType === 'boss-challenge') {
    axis = 'creative'
  } else if (matched.step.stepNumber === 4) {
    axis = 'state'
  } else if (matched.step.stepNumber === 6) {
    axis = variantIndex === 2 ? 'creative' : variantIndex === 1 ? 'action' : 'state'
  }

  return {
    step: matched.step,
    exercise,
    sourceStepNumber: matched.step.stepNumber,
    canonicalOptions: canonicalOptionsForExercise(scopedLesson, exercise, exercise.correctAnswer),
    variantIndex,
    variantProfileId: profile?.id,
    axis,
  }
}
