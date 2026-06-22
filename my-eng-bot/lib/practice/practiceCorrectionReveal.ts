import type { PracticeChoiceCorrectionPhase } from '@/lib/practice/practiceChoiceCorrectionPhase'
import { LESSON_TEXT_SECTION_PAUSE_MS } from '@/lib/lessonRevealTiming'

/** Пауза перед fade «Скажите» в пузыре (не для unlock композера). */
export const PRACTICE_CHOICE_CORRECTION_UNLOCK_PAUSE_MS = LESSON_TEXT_SECTION_PAUSE_MS

export function isVoiceComposerLocked(
  _correctionPhase: PracticeChoiceCorrectionPhase,
  baseLocked: boolean,
): boolean {
  return baseLocked
}

/**
 * @deprecated Scroll-based unlock заменён на correctionPhase.
 */
export function isPracticeChoiceCorrectionComposerLocked(
  baseLocked: boolean,
  unlockReady: boolean,
  needsUnlockDefer: boolean
): boolean {
  return baseLocked || (needsUnlockDefer && !unlockReady)
}
