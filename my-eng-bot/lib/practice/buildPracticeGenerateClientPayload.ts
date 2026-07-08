import {
  collectPriorSessionPhrasesFromQuestions,
  collectRecentInterlocutorLines,
  collectRecentTargetAnswers,
} from '@/lib/practice/roleplaySessionDedup'
import type { PriorSessionPhrase } from '@/lib/practice/roleplaySessionContinuity'
import type { PracticeMode, PracticeSession } from '@/types/practice'

export type PracticeGenerateDedupPayload = {
  priorSessionPhrases?: PriorSessionPhrase[]
  recentTargetAnswers?: string[]
  recentInterlocutorLines?: string[]
}

export function buildPracticeGenerateInitialDedupPayload(mode: PracticeMode): PracticeGenerateDedupPayload {
  if (mode === 'challenge') {
    return { priorSessionPhrases: [] }
  }
  if (mode === 'reference') {
    return { recentTargetAnswers: [], recentInterlocutorLines: [] }
  }
  return {}
}

export function buildPracticeGenerateDedupPayload(session: PracticeSession): PracticeGenerateDedupPayload {
  if (session.mode === 'challenge') {
    return { priorSessionPhrases: collectPriorSessionPhrasesFromQuestions(session.questions) }
  }
  if (session.mode === 'reference') {
    return {
      recentTargetAnswers: collectRecentTargetAnswers(session.questions),
      recentInterlocutorLines: collectRecentInterlocutorLines(session.questions),
    }
  }
  return {}
}
