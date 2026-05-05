export type VocabularyWorldId = 'home' | 'school' | 'travel' | 'digital' | 'core'

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
}

export interface VocabularyWorldDefinition {
  id: VocabularyWorldId
  title: string
  badge: string
  description: string
}

export interface NecessaryWordsCatalog {
  dictionaryVersion: number
  generatedAt: string
  sourceFile: string
  worlds: VocabularyWorldDefinition[]
  words: NecessaryWord[]
}

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
  worldId: VocabularyWorldId
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
