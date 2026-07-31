import { COMMUNICATION_SESSION_EXIT_COPY } from '@/lib/uiCopy/communicationSessionExit'
import type { CommunicationSessionStatus } from '@/lib/communication/communicationSessionEconomy'

export type CommunicationSessionExitChip = {
  id: 'done' | 'practice'
  labelRu: string
}

/** Sticky exit chips только после закрытия цели 8/8. */
export function resolveCommunicationSessionExitChips(
  status: CommunicationSessionStatus | null | undefined
): CommunicationSessionExitChip[] {
  if (status !== 'completed') return []
  return [
    { id: 'done', labelRu: COMMUNICATION_SESSION_EXIT_COPY.chipDone },
    { id: 'practice', labelRu: COMMUNICATION_SESSION_EXIT_COPY.chipPractice },
  ]
}
