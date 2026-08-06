import type { PracticeFooterState } from '@/lib/practice/practiceFooter'

/** Maps PracticeScreen flow state onto footer coach / meter states. */
export function mapPracticeFlowToFooterState(
  state:
    | 'idle'
    | 'briefing'
    | 'active'
    | 'submitting'
    | 'checking'
    | 'feedback'
    | 'correction'
    | 'generating_next'
    | 'completed'
    | 'error'
): PracticeFooterState {
  if (state === 'active') return 'idle'
  return state
}
