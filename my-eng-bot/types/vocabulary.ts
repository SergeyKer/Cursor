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
  | { kind: 'pack'; packId: string }

/** WordFeed lifecycle (UI: К изучению / В деле / Умею). */
export type VocabularyFeedStatus = 'none' | 'in_feed' | 'mastered' | 'returned'

export type VocabularyWordSource = 'catalog' | 'mistake' | 'pack'

export type VocabularyTempo = 'sprint' | 'full'

export interface VocabularyWordProgress {
  wordId: number
  stage: number
  attempts: number
  successes: number
  failures: number
  lastReviewedAt: number | null
  nextReviewAt: number | null
  /** Spoken EN accepts in thin loop (real mic/typed match). */
  spokenEnCount?: number
  lastSpokenEnAt?: number | null
  phraseSpokenCount?: number
  lastPhraseAt?: number | null
  feedStatus?: VocabularyFeedStatus
  useStreak?: number
  checkPassedOnce?: boolean
  passedAt?: number | null
  source?: VocabularyWordSource
  packId?: string
  lemmaKey?: string
  lastFocusUsedAt?: number | null
}

export interface VocabularyFocusLemma {
  en: string
  ru: string
  wordId?: number
  lemmaKey?: string
}

export interface VocabularySessionHistoryItem {
  id: string
  route: VocabularySessionRoute
  startedAt: number
  completedAt: number
  reviewedWordIds: number[]
  learnedWordIds: number[]
  /** Banked this session (Path A). */
  bankedWordIds?: number[]
  coinsEarned: number
  promptPreview: string
  tempo?: VocabularyTempo
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
