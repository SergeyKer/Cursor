import type { PracticeDistractorTier, PracticeMode } from '@/lib/practice/engine/stepSpec'
import { PRACTICE_CHOICE_MAX_OPTIONS } from '@/lib/practice/ensurePracticeChoiceOptions'
import type { GapWordSlot } from '@/lib/practice/gapWordSlot'
import type { LessonData } from '@/types/lesson'

const CLOSED_SLOTS = new Set<GapWordSlot>(['article', 'auxiliary'])

export type ResolveDropdownOptionCountParams = {
  slot: GapWordSlot
  lesson?: Pick<LessonData, 'level'>
  mode?: PracticeMode
  tier?: PracticeDistractorTier
}

function toPracticeLevel(level: LessonData['level'] | undefined): LessonData['level'] {
  if (level === 'A1' || level === 'A2' || level === 'B1' || level === 'B2' || level === 'C1') return level
  return 'A2'
}

export function resolveDropdownOptionCount(params: ResolveDropdownOptionCountParams): number {
  const lessonLevel = toPracticeLevel(params.lesson?.level)

  if (CLOSED_SLOTS.has(params.slot)) return 3
  if (params.mode === 'relaxed' || params.tier === 'obvious') return 3
  if (lessonLevel === 'A1' || lessonLevel === 'A2' || lessonLevel === 'B1' || lessonLevel === 'B2') return 4
  return Math.min(4, PRACTICE_CHOICE_MAX_OPTIONS)
}
