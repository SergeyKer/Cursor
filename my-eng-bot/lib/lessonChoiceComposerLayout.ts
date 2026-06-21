import { isLessonChoiceChipsPanel } from '@/lib/lessonComposerLayout'
import type { Exercise } from '@/types/lesson'

export type LessonChoiceComposerLayoutInput = {
  exercise: Exercise | null | undefined
  deferUntilReveal: boolean
  isRevealInProgress: boolean
  isRevealInitializedForKey: boolean
  isChoiceChipsVisible: boolean
  prefersReducedMotion: boolean
}

export type LessonChoiceComposerLayout = {
  mountChips: boolean
  reserveMinHeight: boolean
  lockReleased: boolean
}

/**
 * Фазы композера для fill_choice / micro_quiz в уроке.
 * Не-choice шаги: mount сразу, без резерва minHeight под чипы.
 */
export function resolveLessonChoiceComposerLayout(
  input: LessonChoiceComposerLayoutInput
): LessonChoiceComposerLayout {
  const isChoicePanel = isLessonChoiceChipsPanel(input.exercise)

  if (!isChoicePanel) {
    return {
      mountChips: true,
      reserveMinHeight: false,
      lockReleased: !input.isRevealInProgress,
    }
  }

  if (!input.deferUntilReveal || input.prefersReducedMotion) {
    return {
      mountChips: true,
      reserveMinHeight: !input.prefersReducedMotion && input.isChoiceChipsVisible,
      lockReleased: true,
    }
  }

  if (input.isChoiceChipsVisible) {
    return {
      mountChips: true,
      reserveMinHeight: true,
      // Держим lock при показе чипов - снятие minHeight вместе с mount дёргает ленту.
      lockReleased: false,
    }
  }

  if (
    !input.isRevealInitializedForKey ||
    input.isRevealInProgress
  ) {
    return {
      mountChips: true,
      reserveMinHeight: true,
      lockReleased: false,
    }
  }

  return {
    mountChips: true,
    reserveMinHeight: false,
    lockReleased: true,
  }
}
