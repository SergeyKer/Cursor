import type { TranslationSessionStatus } from '@/lib/translation/translationSessionEconomy'
import { TRANSLATION_SESSION_EXIT_COPY } from '@/lib/uiCopy/translationSessionExit'

export type TranslationSessionExitChipId = 'done' | 'practice'

export type TranslationSessionExitChip = {
  id: TranslationSessionExitChipId
  labelRu: string
}

/** Sticky exit chips только после закрытия цели 8/8. */
export function resolveTranslationSessionExitChips(
  status: TranslationSessionStatus | null | undefined
): TranslationSessionExitChip[] {
  if (status !== 'completed') return []
  return [
    { id: 'done', labelRu: TRANSLATION_SESSION_EXIT_COPY.chipDone },
    { id: 'practice', labelRu: TRANSLATION_SESSION_EXIT_COPY.chipPractice },
  ]
}
