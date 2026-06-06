import type { PracticeFlowState } from '@/hooks/usePracticeSession'

export const PRACTICE_ANSWER_REVEAL_MS = 500
export const PRACTICE_CHECKING_MS = 2000
export const PRACTICE_FEEDBACK_MS = 2000
export const PRACTICE_CHECKING_MESSAGE = 'Engvo проверяет ответ...'

/** Пустой композер на паузе между заданиями (как lock панели в уроке). */
export function isPracticeComposerLocked(state: PracticeFlowState): boolean {
  return (
    state === 'submitting' ||
    state === 'checking' ||
    state === 'feedback' ||
    state === 'generating_next'
  )
}

/** Скрыть карточку текущего задания после верного ответа, пока идёт переход. */
export function shouldHideCurrentPracticeQuestionBubbles(params: {
  state: PracticeFlowState
  questionIndex: number
  currentIndex: number
}): boolean {
  if (params.questionIndex !== params.currentIndex) return false
  return params.state === 'feedback' || params.state === 'generating_next'
}

export function isPracticeComposerCollapsed(state: PracticeFlowState): boolean {
  return state === 'briefing' || isPracticeComposerLocked(state)
}
