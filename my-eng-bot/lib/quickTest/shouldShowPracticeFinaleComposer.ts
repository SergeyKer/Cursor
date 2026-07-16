import type { PracticeSession } from '@/types/practice'

export function shouldShowPracticeFinaleComposer(
  session: Pick<PracticeSession, 'entrySource'>,
  state: string
): boolean {
  if (state !== 'completed') return false
  return session.entrySource !== 'quick_test'
}
