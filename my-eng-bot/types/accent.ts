import type { Audience } from '@/lib/types'

export type AccentAudience = Audience

export type AccentBlockType = 'words' | 'pairs' | 'progressive'
export type AccentBlockState = 'idle' | 'recording' | 'preview' | 'submitting' | 'feedback' | 'complete'
export type AccentSessionMode = 'mini' | 'quick' | 'standard' | 'expert' | 'problem_only'
export type AccentLessonSessionKind = 'full' | 'single'

export interface AccentMinimalPair {
  target: string
  contrast: string
}

export interface AccentSubstitutionPattern {
  id: string
  label: string
  expectedIncludes?: string
  examples: Record<string, string[]>
  hint: string
}

export interface AccentLesson {
  id: string
  sectionId: string
  title: string
  shortTitle: string
  targetSound: string
  marker: string
  childMarker: string
  teacherNote: string
  words: string[]
  minimalPairs: AccentMinimalPair[]
  progressiveLines: string[]
  knownSubstitutions: AccentSubstitutionPattern[]
}

export interface AccentSection {
  id: string
  title: string
  subtitle: string
  lessonIds: string[]
}

export interface AccentMenuGroup {
  id: string
  title: string
  subtitle: string
  lessonIds: string[]
}

export interface AccentSessionPlan {
  mode: AccentSessionMode
  label: string
  timeLabel: string
  wordCount: number
  pairCount: number
  progressiveLineCount: number
  includeProblemLoop: boolean
}

export interface AccentAttemptInput {
  lessonId: string
  blockType: AccentBlockType
  transcript: string
  expectedWords?: string[]
  expectedPairs?: AccentMinimalPair[]
  progressiveLines?: string[]
  knownSubstitutions: AccentSubstitutionPattern[]
}

export interface AccentWordMatch {
  expected: string
  heard?: string
  status: 'recognized' | 'fuzzy' | 'substitution' | 'missing'
  patternId?: string
}

export interface AccentPairMatch {
  target: string
  contrast: string
  status: 'recognized' | 'missing_target' | 'missing_contrast' | 'same_word' | 'merged'
  hint: string
}

export interface AccentProgressiveMatch {
  line: string
  lineNumber: number
  status: 'recognized' | 'broken'
}

export interface AccentBlockFeedback {
  lessonId: string
  blockType: AccentBlockType
  score: number
  summary: string
  coachMessage: string
  wordMatches?: AccentWordMatch[]
  pairMatches?: AccentPairMatch[]
  progressiveMatches?: AccentProgressiveMatch[]
  problemWords: string[]
}

export interface AccentLessonProgress {
  lessonId: string
  version: number
  attempts: number
  lastScore: number
  bestScore: number
  lastCompletedAt: string | null
  completedDates: string[]
  segmentAttempts: Record<AccentBlockType, number>
  segmentSuccessfulAttempts: Record<AccentBlockType, number>
}

export interface AccentProgressSummary {
  progress: AccentLessonProgress
}

export interface AccentAttemptRuntime {
  attemptId: string
  state: AccentBlockState
  finalized: boolean
}
