export type TutorMicroChoicePhase = 'idle' | 'revealing' | 'active' | 'finale'

/** Options stay mounted after an answer; opening reveal has no selection yet. */
export function shouldShowTutorMicroOptions(
  phase: TutorMicroChoicePhase,
  hasReveal: boolean
): boolean {
  return phase === 'active' || (phase === 'revealing' && hasReveal)
}

/** Freeze only while holding the answered chip row (not opening intro). */
export function isTutorMicroChoiceFrozen(
  phase: TutorMicroChoicePhase,
  hasReveal: boolean
): boolean {
  return phase === 'revealing' && hasReveal
}

/**
 * Stable across active → answer-revealing so LessonChoiceChips keeps selected.
 * Opening revealing has no options row key.
 */
export function resolveTutorMicroChipsResetKey(
  phase: TutorMicroChoicePhase,
  itemId: string | undefined,
  index: number,
  hasReveal: boolean
): string | undefined {
  if (!shouldShowTutorMicroOptions(phase, hasReveal)) return undefined
  return `${itemId ?? 'item'}-${index}`
}
