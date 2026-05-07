export type VocabularyWorldId = 'home' | 'school' | 'travel' | 'digital' | 'core'

export type VocabularyLevelId = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'

export type VocabularyTopicId =
  | 'travel'
  | 'food'
  | 'work'
  | 'family'
  | 'health'
  | 'tech'
  | 'education'
  | 'culture'
  | 'core'

export type NecessaryWordStatus = 'active' | 'excluded' | 'needsReview'

export interface ParsedNecessaryWord {
  id: number
  en: string
  ru: string
  transcription: string
  source: string
}

export interface NecessaryWord extends ParsedNecessaryWord {
  tags: string[]
  status: NecessaryWordStatus
  primaryWorld: VocabularyWorldId
  secondaryWorld?: VocabularyWorldId
  primaryLevel: VocabularyLevelId
  secondaryLevel?: VocabularyLevelId
  primaryVocabularyTopic: VocabularyTopicId
  secondaryVocabularyTopic?: VocabularyTopicId
}

export interface VocabularyWorldDefinition {
  id: VocabularyWorldId
  title: string
  badge: string
  description: string
}

export interface VocabularyLevelDefinition {
  id: VocabularyLevelId
  title: string
  /** Например «A1 - начальный» */
  prefixLabel: string
  hint?: string
}

export interface VocabularyTopicDefinition {
  id: VocabularyTopicId
  title: string
  badge: string
  description: string
}

export interface NecessaryWordsCatalog {
  dictionaryVersion: number
  generatedAt: string
  sourceFile: string
  worlds: VocabularyWorldDefinition[]
  levels: VocabularyLevelDefinition[]
  topics: VocabularyTopicDefinition[]
  words: NecessaryWord[]
}

export type VocabularySessionRoute =
  | { kind: 'world'; worldId: VocabularyWorldId }
  | { kind: 'level'; levelId: VocabularyLevelId; topicId: VocabularyTopicId }

export interface VocabularyWordProgress {
  wordId: number
  stage: number
  attempts: number
  successes: number
  failures: number
  lastReviewedAt: number | null
  nextReviewAt: number | null
}

export interface VocabularySessionHistoryItem {
  id: string
  route: VocabularySessionRoute
  startedAt: number
  completedAt: number
  reviewedWordIds: number[]
  learnedWordIds: number[]
  coinsEarned: number
  promptPreview: string
}

export interface VocabularyProgressState {
  schemaVersion: number
  stats: {
    coins: number
    streak: number
    level: number
    unlockedWorldIds: VocabularyWorldId[]
    completedSessions: number
  }
  words: Record<string, VocabularyWordProgress>
  history: VocabularySessionHistoryItem[]
}

export interface VocabularyFooterView {
  dynamicText: string
  staticText: string
  typingKey: string
}
