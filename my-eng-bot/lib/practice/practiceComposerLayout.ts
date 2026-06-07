import type { PracticeQuestion } from '@/types/practice'

const CHOICE_CHIPS_TYPES = new Set<PracticeQuestion['type']>([
  'choice',
  'speed-round',
  'context-clue',
  'listening-select',
])

/** Нижняя панель с LessonChoiceChips (не dropdown-fill и не correction). */
export function isPracticeChoiceChipsPanel(
  question: PracticeQuestion | null,
  correctionMode: boolean
): boolean {
  if (!question || correctionMode) return false
  if (!CHOICE_CHIPS_TYPES.has(question.type)) return false
  return (question.options?.length ?? 0) > 0
}
