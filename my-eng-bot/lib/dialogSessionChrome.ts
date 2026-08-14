/**
 * Dialog session chrome: wallpaper/frame full width; content capped at 29rem.
 * Start/home stays `max-w-[23.2rem]` elsewhere. Gutter keeps `chat-shell-x` for closest().
 */

export const DIALOG_SESSION_GUTTER_CLASS =
  'dialog-session-gutter chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3'

export const DIALOG_SESSION_COLUMN_MAX_CLASS = 'max-w-[29rem]' as const

/** Inner content column only — not around the wallpaper frame. */
export const DIALOG_SESSION_COLUMN_CLASS =
  `mx-auto w-full ${DIALOG_SESSION_COLUMN_MAX_CLASS}`

export const DIALOG_SESSION_FEED_INNER_CLASS =
  `${DIALOG_SESSION_COLUMN_CLASS} p-2.5 sm:p-3`

export const DIALOG_SESSION_READING_INNER_CLASS =
  `${DIALOG_SESSION_COLUMN_CLASS} px-3 sm:px-4`

export const DIALOG_SESSION_FRAME_CLASS =
  'dialog-session-frame glass-surface flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--chat-shell-bg)]'

export const DIALOG_SESSION_HEADER_GUTTER_CLASS =
  'dialog-session-gutter chat-shell-x flex w-full min-h-[var(--app-header-row-height)] items-center'

export const DIALOG_SESSION_FOOTER_GUTTER_CLASS =
  'dialog-session-gutter chat-shell-x app-footer-root pointer-events-none w-full shrink-0'

export type DialogSessionColumnInput = {
  dialogStarted: boolean
  isMyPlanSpaceActive?: boolean
  isProgressSpaceActive?: boolean
  isReferenceSheetActive?: boolean
  isLessonIntroActive?: boolean
  isLessonTipsActive?: boolean
  isLessonBriefingActive?: boolean
  isStructuredLessonActive?: boolean
  isPracticeActive?: boolean
  isAccentActive?: boolean
  isTutorChatSpaceActive?: boolean
  isVocabularyHubActive?: boolean
  vocabularyWorldsActive?: boolean
  vocabularyFeedActive?: boolean
  vocabularyPackId?: string | null
}

/**
 * Header/footer use the dialog column when the visible body is session chrome.
 * Vocabulary Worlds / Pack / Feed keep the old 29rem card stack — not this.
 */
export function usesDialogSessionColumn(input: DialogSessionColumnInput): boolean {
  if (input.isMyPlanSpaceActive || input.isProgressSpaceActive) return true
  if (input.isReferenceSheetActive) return true
  if (input.isLessonIntroActive || input.isLessonTipsActive || input.isLessonBriefingActive) {
    return true
  }
  if (input.isStructuredLessonActive || input.isPracticeActive || input.isAccentActive) {
    return true
  }
  if (input.isTutorChatSpaceActive) return true
  if (
    input.isVocabularyHubActive &&
    !input.vocabularyWorldsActive &&
    !input.vocabularyFeedActive &&
    !input.vocabularyPackId
  ) {
    return true
  }
  return input.dialogStarted
}
