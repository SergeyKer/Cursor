import {
  isPracticeVoicePrimaryComposerType,
  type PracticeVoicePrimaryComposerType,
} from '@/lib/practice/practiceCorrectionFamily'
import type { PracticeQuestion } from '@/types/practice'

export type PracticeComposerEnterClassOptions = {
  isChoiceVoiceCorrection: boolean
  isVoiceRepeatCorrection: boolean
  correctionMode: boolean
  prefersReducedMotion: boolean
  suppressEnterAnimation?: boolean
}

export type PracticeComposerEnterOnceState = {
  questionId: string
  consumed: boolean
}

/** Enter-анимация один раз за вопрос; при suppress (freeze/reveal) — без выезда при отморозке. */
export function resolvePracticeComposerEnterClassOnce(
  prev: PracticeComposerEnterOnceState,
  questionId: string,
  options: PracticeComposerEnterClassOptions
): { enterClass: string; next: PracticeComposerEnterOnceState } {
  const next: PracticeComposerEnterOnceState =
    prev.questionId === questionId ? prev : { questionId, consumed: false }

  if (options.suppressEnterAnimation) {
    return { enterClass: '', next: { ...next, consumed: true } }
  }

  if (next.consumed) {
    return { enterClass: '', next }
  }

  const enterClass = getPracticeComposerEnterClass(options)
  if (!enterClass) {
    return { enterClass: '', next }
  }

  return { enterClass, next: { ...next, consumed: true } }
}

/** Voice correction choice: soft fade; text correction: practice-section-appear; voice-primary step 1: no slide-in. */
export function getPracticeComposerEnterClass(options: PracticeComposerEnterClassOptions): string {
  if (options.prefersReducedMotion) return ''
  if (options.isChoiceVoiceCorrection || options.isVoiceRepeatCorrection) return 'lesson-text-soft-enter'
  if (options.suppressEnterAnimation) return ''
  return options.correctionMode ? 'practice-section-appear' : 'lesson-enter'
}

export function shouldSuppressPracticeComposerEnterAnimation(params: {
  questionType: PracticeQuestion['type'] | undefined
  questionIndex: number
}): boolean {
  return params.questionIndex === 0 && isPracticeVoicePrimaryComposerType(params.questionType)
}

export type { PracticeVoicePrimaryComposerType }
