import type { Audience } from '@/lib/types'
import {
  getChoiceCorrectionInputMode,
  isChoiceCorrectionTextareaReadOnly,
  isChoiceCorrectionVoiceFrozenDisplay,
  type ChoiceCorrectionInputMode,
} from '@/lib/practice/choiceCorrectionComposer'

export function vocabSpeakFooterHint(_audience?: Audience): string {
  return 'Голосовой ввод.'
}

export function vocabSpeakMicTitle(listening: boolean, finalizing: boolean): string {
  if (listening) return 'Остановить'
  if (finalizing) return 'Распознаю речь'
  return 'Голосовой ввод'
}

export function resolveVocabSpeakInputMode(params: {
  isTextEditUnlocked: boolean
  voiceListening: boolean
}): ChoiceCorrectionInputMode {
  return getChoiceCorrectionInputMode(params)
}

export function isVocabSpeakFieldReadOnly(mode: ChoiceCorrectionInputMode): boolean {
  return isChoiceCorrectionTextareaReadOnly(mode)
}

export function isVocabSpeakFieldFrozen(params: {
  isTextEditUnlocked: boolean
  inputMode: ChoiceCorrectionInputMode
}): boolean {
  return isChoiceCorrectionVoiceFrozenDisplay(params)
}

/** Soft-advance: always may proceed after an attempt; credit only on match. */
export function resolveVocabSpeakCommit(params: {
  matched: boolean
  step: 'speak_en' | 'check_fail_say'
  checkPassed: boolean
}): { advance: true; speakPassed?: boolean } {
  if (params.step === 'speak_en') {
    return {
      advance: true,
      speakPassed: params.matched ? true : undefined,
    }
  }
  // check_fail_say: practice only — never bank Speak✓ from fail path alone
  return {
    advance: true,
    speakPassed: params.matched ? params.checkPassed : undefined,
  }
}
