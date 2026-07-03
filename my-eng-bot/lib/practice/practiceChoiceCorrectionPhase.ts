import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import {
  LESSON_TEXT_FADE_MS,
  LESSON_TEXT_SECTION_PAUSE_MS,
} from '@/lib/lessonRevealTiming'
import { LESSON_REVEAL_END_OVERFLOW_SETTLE_MS } from '@/lib/lessonFeedScroll'
import { isPracticeRepeatCorrectionType } from '@/lib/practice/practiceCorrectionFamily'
import type { PracticeQuestion } from '@/types/practice'

export type PracticeChoiceCorrectionPhase = 'idle' | 'chips' | 'voiceLocked' | 'voiceReady'

/** Длительность фазы chips до voice (подсветка неверного держится до конца фазы). */
export const PRACTICE_CORRECTION_CHIP_PHASE_MS = 2900
/** @deprecated Используйте PRACTICE_CORRECTION_CHIP_PHASE_MS; оставлено для тестов/совместимости. */
export const PRACTICE_CORRECTION_CHIP_MS = 2000
/** @deprecated Пауза после гашения подсветки больше не используется — подсветка до конца chips-фазы. */
export const PRACTICE_CORRECTION_ERROR_READ_EXTRA_MS = 900
export const PRACTICE_CORRECTION_SAY_PAUSE_MS = LESSON_TEXT_SECTION_PAUSE_MS
export const PRACTICE_CORRECTION_SAY_FADE_MS = LESSON_TEXT_FADE_MS
export const PRACTICE_CORRECTION_VOICE_READY_MS = PRACTICE_CORRECTION_CHIP_PHASE_MS
export const PRACTICE_CORRECTION_LAYOUT_SETTLE_MS = LESSON_REVEAL_END_OVERFLOW_SETTLE_MS

/** Оба условия для перехода chips → voiceReady. */
export function canCompleteChipPhase(chipTimerDone: boolean, scrollDone: boolean): boolean {
  return chipTimerDone && scrollDone
}

export function showVoiceCorrectionComposer(
  phase: PracticeChoiceCorrectionPhase,
  questionType: PracticeQuestion['type'] | string | undefined,
): boolean {
  if (phase !== 'voiceLocked' && phase !== 'voiceReady') return false
  if (!questionType) return false
  return isPracticeRepeatCorrectionType(questionType as PracticeQuestion['type'])
}

/** Сброс correctionPhase в idle при уходе из correction-flow. */
export function shouldResetCorrectionPhase(params: {
  isRepeatCorrectionType: boolean
  isCorrectionSession: boolean
  wrongAttemptsOnCurrentQuestion: number
  correctionPhase: PracticeChoiceCorrectionPhase
  state: PracticeFlowState
}): boolean {
  if (!params.isRepeatCorrectionType) return true

  const holdVoicePanel =
    params.wrongAttemptsOnCurrentQuestion > 0 &&
    (params.correctionPhase === 'voiceReady' || params.correctionPhase === 'voiceLocked') &&
    (params.state === 'feedback' || params.state === 'generating_next')

  if (holdVoicePanel) return false
  if (!params.isCorrectionSession) return true
  return false
}
