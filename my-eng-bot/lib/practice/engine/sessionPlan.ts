import {
  BALANCED_STEP_SPECS,
  CHALLENGE_STEP_SPECS,
  getPracticeStepSpecs,
  RELAXED_STEP_SPECS,
} from '@/lib/practice/engine/stepSpec'
import { PRACTICE_EXERCISE_TYPES_CATALOG_ORDER } from '@/lib/practice/practiceExerciseTypeCatalog'
import type { PracticeExerciseType, PracticeMode } from '@/types/practice'

export interface PracticeModePlan {
  length: number
  timeBudgetMinutes: [number, number]
  types: PracticeExerciseType[]
  boss: boolean
}

function typesFromSpecs(specs: readonly { type: PracticeExerciseType }[]): PracticeExerciseType[] {
  return specs.map((spec) => spec.type)
}

export const PRACTICE_MODE_PLANS: Record<PracticeMode, PracticeModePlan> = {
  relaxed: {
    length: RELAXED_STEP_SPECS.length,
    timeBudgetMinutes: [2, 4],
    types: typesFromSpecs(RELAXED_STEP_SPECS),
    boss: false,
  },
  balanced: {
    length: BALANCED_STEP_SPECS.length,
    timeBudgetMinutes: [5, 8],
    types: typesFromSpecs(BALANCED_STEP_SPECS),
    boss: false,
  },
  challenge: {
    length: CHALLENGE_STEP_SPECS.length,
    timeBudgetMinutes: [8, 12],
    types: typesFromSpecs(CHALLENGE_STEP_SPECS),
    boss: true,
  },
  reference: {
    length: 7,
    timeBudgetMinutes: [4, 7],
    types: [...PRACTICE_EXERCISE_TYPES_CATALOG_ORDER],
    boss: false,
  },
}

export function getPracticeModePlan(mode: PracticeMode): PracticeModePlan {
  return PRACTICE_MODE_PLANS[mode]
}

export { getPracticeStepSpecs }
