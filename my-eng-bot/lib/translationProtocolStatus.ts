export type TranslationProtocolStatus = 'prompt_only' | 'success' | 'error_repeat'

/**
 * Единая классификация статуса карточек перевода.
 * Источник истины для UI и backend-нормализации.
 */
export function resolveTranslationProtocolStatus(params: {
  mode: 'dialogue' | 'translation' | 'communication'
  translationSuccessShape: boolean
  translationErrorCoachUi: boolean
}): TranslationProtocolStatus {
  if (params.mode !== 'translation') return 'prompt_only'
  if (params.translationErrorCoachUi) return 'error_repeat'
  if (params.translationSuccessShape) return 'success'
  return 'prompt_only'
}
