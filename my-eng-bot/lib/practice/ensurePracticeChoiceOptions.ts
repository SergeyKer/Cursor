import type { PracticeExerciseType } from '@/types/practice'

const CHOICE_LIKE: PracticeExerciseType[] = [
  'choice',
  'dropdown-fill',
  'listening-select',
  'speed-round',
  'context-clue',
]

export function isChoiceLikePracticeType(type: PracticeExerciseType): boolean {
  return CHOICE_LIKE.includes(type)
}

/** Минимум два уникальных варианта, эталон всегда в списке. */
export function ensurePracticeChoiceOptions(options: string[] | undefined, targetAnswer: string): string[] {
  const unique = Array.from(new Set([targetAnswer, ...(options ?? [])].map((item) => item.trim()).filter(Boolean)))
  if (unique.length >= 2) return unique
  return [targetAnswer, "I don't know yet"]
}
