export function shouldAutoRequestFirstChatMessage(params: {
  storageLoaded: boolean
  initialized: boolean
  dialogStarted: boolean
  messagesLength: number
  loading: boolean
  activeStructuredLesson: boolean
  vocabularyWorldsActive: boolean
  vocabularyByLevelActive: boolean
  engvoVoiceMode: boolean
  /** Hub/tutor dialog-spaces must not seed communication chat. */
  tutorChatSpaceActive?: boolean
  myPlanSpaceActive?: boolean
  progressSpaceActive?: boolean
}): boolean {
  if (!params.storageLoaded) return false
  if (!params.initialized) return false
  if (!params.dialogStarted) return false
  if (params.messagesLength !== 0) return false
  if (params.loading) return false
  if (params.activeStructuredLesson) return false
  if (params.vocabularyWorldsActive) return false
  if (params.vocabularyByLevelActive) return false
  if (params.engvoVoiceMode) return false
  if (params.tutorChatSpaceActive) return false
  if (params.myPlanSpaceActive) return false
  if (params.progressSpaceActive) return false
  return true
}
