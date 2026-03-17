export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
  /** Русский перевод ответа ИИ (приходит в том же ответе после маркера **RU:**). */
  translation?: string
  /** Сообщение об ошибке при загрузке перевода по запросу. */
  translationError?: string
}

export type AiProvider = 'openrouter' | 'openai'

export type AppMode = 'dialogue' | 'translation'
export type SentenceType = 'general' | 'interrogative' | 'negative' | 'mixed'

export type LevelId =
  | 'starter'
  | 'a1'
  | 'a2'
  | 'b1'
  | 'b2'
  | 'c1'
  | 'c2'

export type TenseId =
  | 'all'
  | 'present_simple'
  | 'present_continuous'
  | 'present_perfect'
  | 'present_perfect_continuous'
  | 'past_simple'
  | 'past_continuous'
  | 'past_perfect'
  | 'past_perfect_continuous'
  | 'future_simple'
  | 'future_continuous'
  | 'future_perfect'
  | 'future_perfect_continuous'

export type TopicId =
  | 'free_talk'
  | 'business'
  | 'family_friends'
  | 'hobbies'
  | 'movies_series'
  | 'music'
  | 'sports'
  | 'food'
  | 'culture'
  | 'daily_life'
  | 'travel'
  | 'work'
  | 'technology'

export interface Settings {
  provider: AiProvider
  mode: AppMode
  sentenceType: SentenceType
  topic: TopicId
  level: LevelId
  tense: TenseId
  voiceId: string
}

export interface UsageInfo {
  used: number
  limit: number
}

export interface StoredState {
  messages: ChatMessage[]
  settings: Settings
}
