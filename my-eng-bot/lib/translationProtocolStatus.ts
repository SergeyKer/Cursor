export type TranslationProtocolStatus = 'prompt_only' | 'success' | 'error_repeat' | 'junk_repeat'

type TranslationProtocolFields = {
  comment?: string | null
  commentIsPraise?: boolean
  translationSupportComment?: string | null
  translationJunkComment?: string | null
  errorsBlock?: string | null
  repeat?: string | null
  repeatRu?: string | null
}

function hasVisibleProtocolText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function commentLooksCorrective(comment: string | null | undefined): boolean {
  if (!hasVisibleProtocolText(comment)) return false
  return /(?:проверь|исправ|ошиб|неверн|неправил|нужн|орфограф|лексическ|грамматик|spelling|word choice|verb form)/i.test(
    String(comment)
  )
}

/**
 * Только протокол «Комментарий_мусор» + эталон «Скажи», без ошибок/поддержки/обычного Комментарий.
 */
export function isTranslationJunkOnlyProtocolFields(fields: TranslationProtocolFields): boolean {
  if (!hasVisibleProtocolText(fields.translationJunkComment)) return false
  if (!hasVisibleProtocolText(fields.repeat) && !hasVisibleProtocolText(fields.repeatRu)) return false
  if (hasVisibleProtocolText(fields.errorsBlock)) return false
  if (hasVisibleProtocolText(fields.translationSupportComment)) return false
  if (hasVisibleProtocolText(fields.comment)) return false
  return true
}

/**
 * Единая классификация статуса карточек перевода.
 * Источник истины для UI и backend-нормализации.
 */
export function resolveTranslationProtocolStatus(params: {
  mode: 'dialogue' | 'translation' | 'communication'
  translationSuccessShape: boolean
  translationErrorCoachUi: boolean
  translationJunkRepeat?: boolean
}): TranslationProtocolStatus {
  if (params.mode !== 'translation') return 'prompt_only'
  if (params.translationJunkRepeat) return 'junk_repeat'
  if (params.translationErrorCoachUi) return 'error_repeat'
  if (params.translationSuccessShape) return 'success'
  return 'prompt_only'
}

export function hasTranslationErrorProtocolFields(fields: TranslationProtocolFields): boolean {
  if (hasVisibleProtocolText(fields.comment) && fields.commentIsPraise === false && commentLooksCorrective(fields.comment)) {
    return true
  }
  return (
    hasVisibleProtocolText(fields.translationSupportComment) ||
    hasVisibleProtocolText(fields.errorsBlock) ||
    hasVisibleProtocolText(fields.repeat) ||
    hasVisibleProtocolText(fields.repeatRu)
  )
}

export function hasTranslationSuccessProtocolFields(fields: TranslationProtocolFields): boolean {
  if (!hasVisibleProtocolText(fields.comment)) return false
  if (hasTranslationErrorProtocolFields(fields)) return false
  if (fields.commentIsPraise === false && commentLooksCorrective(fields.comment)) return false
  return true
}

export function resolveTranslationProtocolStatusFromFields(
  fields: TranslationProtocolFields
): TranslationProtocolStatus {
  if (isTranslationJunkOnlyProtocolFields(fields)) return 'junk_repeat'
  return resolveTranslationProtocolStatus({
    mode: 'translation',
    translationSuccessShape: hasTranslationSuccessProtocolFields(fields),
    translationErrorCoachUi: hasTranslationErrorProtocolFields(fields),
  })
}
