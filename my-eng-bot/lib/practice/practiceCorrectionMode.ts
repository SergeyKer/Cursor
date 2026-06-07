import type { PracticeFlowState } from '@/hooks/usePracticeSession'

/** Композер коррекции активен: в correction и пока идёт повторная проверка после ошибки. */
export function isPracticeCorrectionComposerActive(
  state: PracticeFlowState,
  wrongAttemptsOnCurrentQuestion: number
): boolean {
  return (
    state === 'correction' ||
    (wrongAttemptsOnCurrentQuestion > 0 && (state === 'submitting' || state === 'checking'))
  )
}
