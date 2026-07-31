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
  /** Overlay hubs that keep dialogStarted + stuck mode (no ×). */
  isVocabularyHubActive?: boolean
  isAccentActive?: boolean
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
  isAccentActive?: boolean
}

function isChatMidSession(
  chatActive: boolean | undefined,
  status: string | null | undefined,
  overlaysBlocked: boolean
): boolean {
  return Boolean(chatActive) && status === 'in_progress' && !overlaysBlocked
}

/**
 * × в шапке в locked mid-cycle: урок, практика, translation/dialogue/communication in_progress.
 * Не показывать на intro/briefing/finale, при открытом меню, на Engvo call,
 * vocabulary/accent overlays и completed chat-сессиях (там chips).
 */
export function shouldShowSessionExitControl(input: ShouldShowSessionExitControlInput): boolean {
  if (input.menuOpen) return false

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

  return (
    lessonLocked || practiceLocked || translationLocked || dialogueLocked || communicationLocked
  )
}

export function resolveSessionExitKind(input: ResolveSessionExitKindInput): SessionExitKind | null {
  const overlaysBlocked = Boolean(input.isVocabularyHubActive || input.isAccentActive)

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
  return null
}
