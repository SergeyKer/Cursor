import { canShowLanguageNoteInfo } from '@/lib/languageNote/eligibility'
import type { LanguageNoteStatus } from '@/lib/languageNote/types'
import type { CommunicationVoiceInputMode } from '@/lib/types'

/** Whether a Language Note / silent result should become a learning signal. */
export function shouldSaveLanguageNoteSignal(
  status: LanguageNoteStatus | undefined | null,
  text: string,
  voiceMode?: CommunicationVoiceInputMode | null
): boolean {
  if (status !== 'needs_fix') return false
  return canShowLanguageNoteInfo(text, { voiceMode: voiceMode ?? null })
}
