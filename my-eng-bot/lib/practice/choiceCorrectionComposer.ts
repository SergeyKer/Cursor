import type { Audience } from '@/lib/types'

export type PracticeVoiceCapability = 'available' | 'unavailable' | 'permission_denied'

function choiceCorrectionSayVerb(audience: Audience): 'Скажи' | 'Скажите' {
  return audience === 'child' ? 'Скажи' : 'Скажите'
}

export type ChoiceCorrectionInputMode = 'editable' | 'voiceLive' | 'voiceLocked'

export function getInitialPracticeVoiceCapability(): PracticeVoiceCapability {
  if (typeof window === 'undefined') return 'unavailable'
  if (!window.isSecureContext) return 'unavailable'
  const SpeechRecognitionAPI =
    (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
  if (!SpeechRecognitionAPI) return 'unavailable'
  return 'available'
}

export function mapRecognitionErrorToVoiceCapability(errorCode: string): PracticeVoiceCapability | null {
  if (/not-allowed|audio-capture|service-not-allowed/i.test(errorCode)) {
    return 'permission_denied'
  }
  return null
}

export function isVoiceCapabilityBlocked(capability: PracticeVoiceCapability): boolean {
  return capability !== 'available'
}

export function getChoiceCorrectionInputMode(params: {
  isTextEditUnlocked: boolean
  voiceListening: boolean
}): ChoiceCorrectionInputMode {
  if (params.isTextEditUnlocked) return 'editable'
  if (params.voiceListening) return 'voiceLive'
  return 'voiceLocked'
}

export function shouldShowMicOffInlineButton(params: {
  isChoiceCorrection: boolean
  textFallbackUnlocked: boolean
  isTextEditUnlocked: boolean
  fieldTapHintVisible: boolean
  voiceCapability: PracticeVoiceCapability
}): boolean {
  if (!params.isChoiceCorrection) return false
  if (params.textFallbackUnlocked || params.isTextEditUnlocked) return false
  return params.fieldTapHintVisible || isVoiceCapabilityBlocked(params.voiceCapability)
}

export function isChoiceCorrectionTextareaReadOnly(mode: ChoiceCorrectionInputMode): boolean {
  return mode !== 'editable'
}

/** После диктовки: приглушённый цвет как у interim, чтобы поле читалось как freeze, не как редактируемое. */
export function isChoiceCorrectionVoiceFrozenDisplay(params: {
  isTextEditUnlocked: boolean
  inputMode: ChoiceCorrectionInputMode
}): boolean {
  return !params.isTextEditUnlocked && params.inputMode !== 'editable'
}

export const CHOICE_CORRECTION_TAP_HINT_WITH_TEXT_EDIT = 'Редактировать...'

export function getChoiceCorrectionTapHint(audience: Audience): string {
  return `${choiceCorrectionSayVerb(audience)} ответ...`
}

export function getChoiceCorrectionOverlayLine(params: {
  showTapHint: boolean
  showTextEditButton: boolean
  audience: Audience
}): string {
  if (!params.showTapHint) return getChoiceCorrectionTapHint(params.audience)
  return params.showTextEditButton
    ? CHOICE_CORRECTION_TAP_HINT_WITH_TEXT_EDIT
    : getChoiceCorrectionTapHint(params.audience)
}

export function shouldShowChoiceCorrectionInviteOverlay(params: {
  isFrozenDisplay: boolean
  showVoiceOverlay: boolean
  composerText: string
  showTapHint: boolean
}): boolean {
  if (!params.isFrozenDisplay || params.showVoiceOverlay) return false
  return !params.composerText.trim() || params.showTapHint
}

export function choiceCorrectionPlaceholder(params: {
  targetAnswer: string
  isTextEditUnlocked: boolean
  audience: Audience
}): string {
  if (!params.isTextEditUnlocked) return ''
  return params.audience === 'child' ? 'Поправь и отправь' : 'Поправьте и отправьте'
}

export function choiceCorrectionVoiceStatusMessage(params: {
  voiceListening: boolean
}): string | null {
  if (params.voiceListening) return 'Голосовой ввод...'
  return null
}
