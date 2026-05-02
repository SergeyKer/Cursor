import type { PracticeExerciseType, PracticeMode } from '@/types/practice'

export interface PracticeModePlan {
  length: number
  timeBudgetMinutes: [number, number]
  types: PracticeExerciseType[]
  boss: boolean
}

export const PRACTICE_MODE_PLANS: Record<PracticeMode, PracticeModePlan> = {
  relaxed: {
    length: 6,
    timeBudgetMinutes: [2, 4],
    types: ['choice', 'dropdown-fill', 'context-clue', 'sentence-surgery', 'free-response'],
    boss: false,
  },
  balanced: {
    length: 9,
    timeBudgetMinutes: [5, 8],
    types: [
      'choice',
      'dropdown-fill',
      'listening-select',
      'sentence-surgery',
      'free-response',
      'word-builder-pro',
      'dictation',
      'speed-round',
      'context-clue',
    ],
    boss: false,
  },
  challenge: {
    length: 12,
    timeBudgetMinutes: [8, 12],
    types: [
      'choice',
      'voice-shadow',
      'dropdown-fill',
      'listening-select',
      'context-clue',
      'sentence-surgery',
      'free-response',
      'word-builder-pro',
      'dictation',
      'roleplay-mini',
      'speed-round',
      'boss-challenge',
    ],
    boss: true,
  },
}

export function getPracticeModePlan(mode: PracticeMode): PracticeModePlan {
  return PRACTICE_MODE_PLANS[mode]
}
