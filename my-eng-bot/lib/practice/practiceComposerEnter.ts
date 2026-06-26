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
