export type SessionExitLessonStatus = string
export type SessionExitPracticeSessionStatus = 'active' | 'completed' | 'abandoned' | string
export type SessionExitPracticeFlowState =
  | 'idle'
  | 'briefing'
  | 'active'
  | 'correction'
  | 'completed'
  | 'error'
  | string

export type ShouldShowSessionExitControlInput = {
  menuOpen: boolean
  isStructuredLessonActive: boolean
  activeStructuredLessonStatus: SessionExitLessonStatus | null | undefined
  isPracticeActive: boolean
  practiceSessionStatus: SessionExitPracticeSessionStatus | null | undefined
  practiceFlowState: SessionExitPracticeFlowState | null | undefined
}

/**
 * × в шапке только в locked mid-cycle урока/практики.
 * Не показывать на intro/briefing/finale, при открытом меню, на call/chat и т.д.
 */
export function shouldShowSessionExitControl(input: ShouldShowSessionExitControlInput): boolean {
  if (input.menuOpen) return false

  const lessonLocked =
    input.isStructuredLessonActive && input.activeStructuredLessonStatus !== 'completed'

  const practiceState = input.practiceFlowState
  const practiceLocked =
    input.isPracticeActive &&
    input.practiceSessionStatus === 'active' &&
    practiceState !== 'briefing' &&
    practiceState !== 'completed' &&
    practiceState !== 'idle'

  return lessonLocked || practiceLocked
}

export function resolveSessionExitKind(input: {
  isStructuredLessonActive: boolean
  activeStructuredLessonStatus: SessionExitLessonStatus | null | undefined
  isPracticeActive: boolean
}): 'lesson' | 'practice' | null {
  if (input.isStructuredLessonActive && input.activeStructuredLessonStatus !== 'completed') {
    return 'lesson'
  }
  if (input.isPracticeActive) return 'practice'
  return null
}
