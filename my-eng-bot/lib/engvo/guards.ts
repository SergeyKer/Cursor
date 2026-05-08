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
  return true
}
