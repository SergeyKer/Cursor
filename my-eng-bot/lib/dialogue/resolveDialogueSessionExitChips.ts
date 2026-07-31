import type { DialogueSessionStatus } from '@/lib/dialogue/dialogueSessionEconomy'
import { DIALOGUE_SESSION_EXIT_COPY } from '@/lib/uiCopy/dialogueSessionExit'

export type DialogueSessionExitChipId = 'done' | 'practice'

export type DialogueSessionExitChip = {
  id: DialogueSessionExitChipId
  labelRu: string
}

/** Sticky exit chips только после закрытия цели 8/8. */
export function resolveDialogueSessionExitChips(
  status: DialogueSessionStatus | null | undefined
): DialogueSessionExitChip[] {
  if (status !== 'completed') return []
  return [
    { id: 'done', labelRu: DIALOGUE_SESSION_EXIT_COPY.chipDone },
    { id: 'practice', labelRu: DIALOGUE_SESSION_EXIT_COPY.chipPractice },
  ]
}
