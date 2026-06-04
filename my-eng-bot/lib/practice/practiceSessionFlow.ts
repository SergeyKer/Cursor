import { featureFlags } from '@/lib/featureFlags'
import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import type { PracticeSession } from '@/types/practice'

export function shouldShowPracticeInstructionBriefing(session: PracticeSession): boolean {
  if (!featureFlags.practiceInstructionBlockV1) return false
  return session.instructionAcknowledged !== true
}

export function resolvePracticeFlowStateForSession(session: PracticeSession): PracticeFlowState {
  if (session.status !== 'active') return 'idle'
  return shouldShowPracticeInstructionBriefing(session) ? 'briefing' : 'active'
}
