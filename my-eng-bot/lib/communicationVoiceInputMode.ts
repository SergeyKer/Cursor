import type { CommunicationInputExpectedLang, CommunicationVoiceInputMode } from '@/lib/types'

/** User-facing / persisted modes after Ru branch is closed. Switcher hidden: Mix only. */
export type VisibleCommunicationVoiceInputMode = Exclude<CommunicationVoiceInputMode, 'ru'>

export function normalizeCommunicationVoiceInputMode(
  _stored: unknown
): VisibleCommunicationVoiceInputMode {
  return 'mix'
}

export function nextCommunicationVoiceInputMode(
  _prev: unknown,
  _nextExpectedLang: CommunicationInputExpectedLang
): VisibleCommunicationVoiceInputMode {
  return 'mix'
}
