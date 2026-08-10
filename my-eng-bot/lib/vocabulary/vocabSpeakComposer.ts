import type { Audience } from '@/lib/types'
import {
  getChoiceCorrectionInputMode,
  isChoiceCorrectionTextareaReadOnly,
  isChoiceCorrectionVoiceFrozenDisplay,
  type ChoiceCorrectionInputMode,
} from '@/lib/practice/choiceCorrectionComposer'

export function vocabHeardBubbleLabel(audience: Audience): string {
  return audience === 'child' ? 'Ты сказал:' : 'Я услышал:'
}

export function vocabSpeakFooterHint(audience: Audience): string {
  return audience === 'child'
    ? 'Слушай → бип → говори → бип-бип.'
    : 'Эталон → бип → повтор → стоп по тишине.'
}

export function vocabSpeakMicTitle(phase: string, listening: boolean): string {
  if (phase === 'playing' || phase === 'cueStart') return 'Слушаю эталон…'
  if (phase === 'recording' || listening) return 'Остановить запись'
  if (phase === 'cueStop' || phase === 'finalizing') return 'Распознаю…'
  return 'Слушать и повторить'
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
  step: 'speak_en' | 'say_phrase' | 'check_fail_say'
  checkPassed: boolean
}): { advance: true; speakPassed?: boolean; phrasePassed?: boolean } {
  if (params.step === 'say_phrase') {
    return {
      advance: true,
      phrasePassed: params.matched ? true : undefined,
    }
  }
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
