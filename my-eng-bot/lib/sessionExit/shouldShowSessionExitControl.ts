import type { SessionExitKind } from '@/lib/uiCopy/sessionExit'

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
  translationChatActive?: boolean
  translationSessionStatus?: string | null
  dialogueChatActive?: boolean
  dialogueSessionStatus?: string | null
  communicationChatActive?: boolean
  communicationSessionStatus?: string | null
  /** Overlay hubs that keep dialogStarted + stuck mode (no ×) unless thin-session active. */
  isVocabularyHubActive?: boolean
  /** Vocabulary thin-session mid-cycle (Worlds/ByLevel/Pack). */
  isVocabularySessionActive?: boolean
  isAccentActive?: boolean
  /** Reading sheet: never SessionExit (unlike mid-cycle lesson/chat). */
  isReferenceSheetActive?: boolean
  /** Tutor «Закрепить 2 мин» mid-cycle (caller must AND with tutorChatSpaceActive). */
  tutorMicroLocked?: boolean
}

export type ResolveSessionExitKindInput = {
  isStructuredLessonActive: boolean
  activeStructuredLessonStatus: SessionExitLessonStatus | null | undefined
  isPracticeActive: boolean
  translationChatActive?: boolean
  translationSessionStatus?: string | null
  dialogueChatActive?: boolean
  dialogueSessionStatus?: string | null
  communicationChatActive?: boolean
  communicationSessionStatus?: string | null
  isVocabularyHubActive?: boolean
  isVocabularySessionActive?: boolean
  isAccentActive?: boolean
  isReferenceSheetActive?: boolean
  /** Tutor «Закрепить 2 мин» mid-cycle (caller must AND with tutorChatSpaceActive). */
  tutorMicroLocked?: boolean
}

function isChatMidSession(
  chatActive: boolean | undefined,
  status: string | null | undefined,
  overlaysBlocked: boolean
): boolean {
  return Boolean(chatActive) && status === 'in_progress' && !overlaysBlocked
}

/**
 * × в шапке в locked mid-cycle: урок, практика, translation/dialogue/communication in_progress,
 * tutor «Закрепить 2 мин», vocabulary thin-session.
 * Не показывать на intro/briefing/finale, при открытом меню, на Engvo call,
 * vocabulary/accent hubs без active thin-session, reference overlays и completed chat-сессиях (там chips).
 */
export function shouldShowSessionExitControl(input: ShouldShowSessionExitControlInput): boolean {
  if (input.menuOpen) return false
  if (input.isReferenceSheetActive) return false

  const overlaysBlocked = Boolean(input.isVocabularyHubActive || input.isAccentActive)

  const lessonLocked =
    input.isStructuredLessonActive && input.activeStructuredLessonStatus !== 'completed'

  const practiceState = input.practiceFlowState
  const practiceLocked =
    input.isPracticeActive &&
    input.practiceSessionStatus === 'active' &&
    practiceState !== 'briefing' &&
    practiceState !== 'completed' &&
    practiceState !== 'idle'

  const translationLocked = isChatMidSession(
    input.translationChatActive,
    input.translationSessionStatus,
    overlaysBlocked
  )
  const dialogueLocked = isChatMidSession(
    input.dialogueChatActive,
    input.dialogueSessionStatus,
    overlaysBlocked
  )
  const communicationLocked = isChatMidSession(
    input.communicationChatActive,
    input.communicationSessionStatus,
    overlaysBlocked
  )
  const tutorLocked = Boolean(input.tutorMicroLocked)
  const vocabularyLocked = Boolean(input.isVocabularySessionActive)

  return (
    lessonLocked ||
    practiceLocked ||
    translationLocked ||
    dialogueLocked ||
    communicationLocked ||
    tutorLocked ||
    vocabularyLocked
  )
}

export function resolveSessionExitKind(input: ResolveSessionExitKindInput): SessionExitKind | null {
  if (input.isReferenceSheetActive) return null

  const overlaysBlocked = Boolean(input.isVocabularyHubActive || input.isAccentActive)

  if (input.isVocabularySessionActive) return 'vocabulary'
  if (input.isStructuredLessonActive && input.activeStructuredLessonStatus !== 'completed') {
    return 'lesson'
  }
  if (input.isPracticeActive) return 'practice'
  if (isChatMidSession(input.translationChatActive, input.translationSessionStatus, overlaysBlocked)) {
    return 'translation'
  }
  if (isChatMidSession(input.dialogueChatActive, input.dialogueSessionStatus, overlaysBlocked)) {
    return 'dialogue'
  }
  if (
    isChatMidSession(input.communicationChatActive, input.communicationSessionStatus, overlaysBlocked)
  ) {
    return 'communication'
  }
  if (input.tutorMicroLocked) return 'tutor'
  return null
}
