import type { PracticeChoiceCorrectionPhase } from '@/lib/practice/practiceChoiceCorrectionPhase'
import type { PracticeQuestion } from '@/types/practice'

export type PracticeChoiceComposerLayout = {
  mountChips: boolean
  reserveMinHeight: boolean
  lockReleased: boolean
}

export type PracticePuzzleComposerLayout = {
  mountPuzzle: boolean
  reserveMinHeight: boolean
  lockReleased: boolean
}

const CHOICE_CHIPS_TYPES = new Set<PracticeQuestion['type']>([
  'choice',
  'speed-round',
  'context-clue',
  'listening-select',
])

const PUZZLE_PANEL_TYPES = new Set<PracticeQuestion['type']>(['sentence-surgery', 'word-builder-pro'])

/** Нижняя панель sentence-surgery / word-builder-pro (не voice-фаза коррекции). */
export function isPracticePuzzlePanel(
  question: PracticeQuestion | null,
  correctionPhase: PracticeChoiceCorrectionPhase = 'idle'
): boolean {
  if (!question) return false
  if (!PUZZLE_PANEL_TYPES.has(question.type)) return false
  if (correctionPhase === 'voiceLocked' || correctionPhase === 'voiceReady') return false
  return true
}

/** Фазы композера puzzle в практике (зеркало choice layout). */
export function resolvePracticePuzzleComposerLayout(input: {
  isPuzzlePanel: boolean
  deferUntilReveal: boolean
  isRevealInProgress: boolean
  isRevealInitializedForKey: boolean
  isPuzzleVisible: boolean
  prefersReducedMotion: boolean
}): PracticePuzzleComposerLayout {
  if (!input.isPuzzlePanel) {
    return {
      mountPuzzle: true,
      reserveMinHeight: false,
      lockReleased: !input.isRevealInProgress,
    }
  }

  if (!input.deferUntilReveal || input.prefersReducedMotion) {
    return {
      mountPuzzle: true,
      reserveMinHeight: !input.prefersReducedMotion && input.isPuzzleVisible,
      lockReleased: true,
    }
  }

  if (input.isPuzzleVisible) {
    return {
      mountPuzzle: true,
      reserveMinHeight: true,
      lockReleased: false,
    }
  }

  if (!input.isRevealInitializedForKey || input.isRevealInProgress) {
    return {
      mountPuzzle: true,
      reserveMinHeight: true,
      lockReleased: false,
    }
  }

  return {
    mountPuzzle: true,
    reserveMinHeight: false,
    lockReleased: true,
  }
}

/** Нижняя панель с LessonChoiceChips (не dropdown-fill, не voice-фаза коррекции). */
export function isPracticeChoiceChipsPanel(
  question: PracticeQuestion | null,
  correctionPhase: PracticeChoiceCorrectionPhase = 'idle'
): boolean {
  if (!question) return false
  if (!CHOICE_CHIPS_TYPES.has(question.type)) return false
  if ((question.options?.length ?? 0) === 0) return false
  if (correctionPhase === 'voiceLocked' || correctionPhase === 'voiceReady') return false
  return true
}

export function shouldWrapPracticeAudioDeckInGlassShell(
  type: PracticeQuestion['type'] | undefined,
  canUseChoices: boolean,
  canUseAudio: boolean
): boolean {
  return type === 'listening-select' && canUseChoices && canUseAudio
}

/** Фазы композера choice-чипов в практике (как resolveLessonChoiceComposerLayout). */
export function resolvePracticeChoiceComposerLayout(input: {
  isChoicePanel: boolean
  deferUntilReveal: boolean
  isRevealInProgress: boolean
  isRevealInitializedForKey: boolean
  isChoiceChipsVisible: boolean
  prefersReducedMotion: boolean
}): PracticeChoiceComposerLayout {
  if (!input.isChoicePanel) {
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
      lockReleased: false,
    }
  }

  if (!input.isRevealInitializedForKey || input.isRevealInProgress) {
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
