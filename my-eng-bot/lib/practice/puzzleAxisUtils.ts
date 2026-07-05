import type { SentencePuzzleVariant } from '@/types/lesson'

export type WordBuilderPuzzleAxis = 'mood' | 'from' | 'role' | 'unknown'

export function inferPuzzleAxisFromVariant(variant: SentencePuzzleVariant | null | undefined): WordBuilderPuzzleAxis {
  if (!variant) return 'unknown'
  const id = variant.id.toLowerCase()
  const title = variant.title.toLowerCase()
  if (id.includes('puzzle_from') || title.includes('откуда')) return 'from'
  if (id.includes('puzzle_role') || title.includes('роль')) return 'role'
  if (id.includes('puzzle_mood') || title.includes('настроение')) return 'mood'
  return 'unknown'
}

export function inferPuzzleAxisFromTargetAnswer(targetAnswer: string): WordBuilderPuzzleAxis {
  const normalized = targetAnswer.trim()
  if (/\bfrom\b/i.test(normalized)) return 'from'
  if (/\b(am|is|are)\s+(a|an)\s+\w/i.test(normalized)) return 'role'
  if (/^I['']?m\s+\w/i.test(normalized) && !/\bfrom\b/i.test(normalized)) return 'mood'
  return 'unknown'
}

export function resolvePuzzleAxis(
  targetAnswer: string,
  variant?: SentencePuzzleVariant | null
): WordBuilderPuzzleAxis {
  const fromVariant = inferPuzzleAxisFromVariant(variant)
  if (fromVariant !== 'unknown') return fromVariant
  return inferPuzzleAxisFromTargetAnswer(targetAnswer)
}

/** Self-intro lessons: sourceSituations[0]=country, [1]=role, [2]=mood. */
export function sourceSituationIndexForAxis(axis: WordBuilderPuzzleAxis): number | null {
  if (axis === 'from') return 0
  if (axis === 'role') return 1
  if (axis === 'mood') return 2
  return null
}
