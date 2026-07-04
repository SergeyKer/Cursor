import type { Exercise, LessonStep } from '@/types/lesson'
import type { PracticeExerciseType } from '@/types/practice'

export type PracticePromptAxis = 'state' | 'action' | 'creative'

export type PracticePromptSource = {
  step: LessonStep
  exercise: Exercise
  variantProfileId?: string
  variantIndex?: number
  axis?: PracticePromptAxis
  sourceStepNumber: number
}

export type PracticePromptSlot = {
  profileIndex: number
  stepNumber: number
  variantIndex: number
  axis?: PracticePromptAxis
}

export const REFERENCE_STEP_MAP_TYPES = new Set<PracticeExerciseType>([
  'free-response',
  'dropdown-fill',
  'dictation',
  'listening-select',
  'roleplay-mini',
  'speed-round',
  'boss-challenge',
])

const PREFERRED_STEP_NUMBERS: Partial<Record<PracticeExerciseType, readonly number[]>> = {
  'free-response': [4, 6],
  'dropdown-fill': [3],
  dictation: [6, 2],
  'listening-select': [1, 3],
  'roleplay-mini': [6],
  'speed-round': [1, 3],
  'boss-challenge': [6],
}

export function getPreferredStepNumbers(type: PracticeExerciseType): readonly number[] {
  return PREFERRED_STEP_NUMBERS[type] ?? []
}
