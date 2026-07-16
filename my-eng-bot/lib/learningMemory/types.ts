export type LearningSource =
  | 'chat'
  | 'call'
  | 'teacher'
  | 'translation'
  | 'guided_dialogue'
  | 'practice'
  | 'language_note'

export type LearningDetector =
  | 'practice'
  | 'dialogue_flag'
  | 'translation_parse'
  | 'language_note'
  | 'silent_assess'
  | 'teacher_correction'

export type LearningSignal = {
  id: string
  at: string
  source: LearningSource
  detector: LearningDetector
  utteranceHash?: string
  rawTopicIds: string[]
  rawTopicTitles: string[]
  lessonIdHint: string | null
  skillTagIds: string[]
  snippet?: { original?: string; corrected?: string }
}

export type SkillMasterySlice = {
  skillTagId: string
  errorCount: number
  bySource: Partial<Record<LearningSource, number>>
  lastAt: string
  lessonIdHint?: string | null
  resolvedUntil?: string | null
}

export type AttentionZone = {
  skillTagId: string
  title: string
  errorCount: number
  sourceHint: string
  lessonId: string | null
  chipActive: boolean
  suggestionLine: string
  score: number
}

export type SkillRecommendation = {
  kind: 'open_lesson' | 'start_practice' | 'suggest_text'
  lessonId?: string
  title: string
  chipActive: boolean
  suggestionLine: string
}

export const LEARNING_SIGNALS_KEY = 'engvo_learning_signals_v1'
export const SKILL_MASTERY_KEY = 'engvo_skill_mastery_v1'
export const MAX_LEARNING_SIGNALS = 250
export const ATTENTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
export const RESOLVE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
export const MAX_ATTENTION_ZONES = 3
