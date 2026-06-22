import type { PracticeFlowState } from '@/hooks/usePracticeSession'

/** Сессия коррекции: повторная отправка после ошибки (логика canSubmit). */
export function isPracticeCorrectionSession(
  state: PracticeFlowState,
  wrongAttemptsOnCurrentQuestion: number
): boolean {
  return (
    state === 'correction' ||
    (wrongAttemptsOnCurrentQuestion > 0 && (state === 'submitting' || state === 'checking'))
  )
}

/**
 * @deprecated Используйте isPracticeCorrectionSession для логики сессии.
 * Не использовать для UI chips/voice — только correctionPhase.
 */
export function isPracticeCorrectionComposerActive(
  state: PracticeFlowState,
  wrongAttemptsOnCurrentQuestion: number
): boolean {
  return isPracticeCorrectionSession(state, wrongAttemptsOnCurrentQuestion)
}
