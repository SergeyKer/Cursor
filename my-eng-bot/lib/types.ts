export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
  /** Русский перевод ответа ИИ (приходит в том же ответе после маркера **RU:**). */
  translation?: string
  /** Сообщение об ошибке при загрузке перевода по запросу. */
  translationError?: string
  /** Серверный флаг: в режиме dialogue это финальный корректный ответ пользователя. */
  dialogueCorrect?: boolean
}

export type AiProvider = 'openrouter' | 'openai'

export type AppMode = 'dialogue' | 'translation' | 'communication'
export type SentenceType = 'general' | 'interrogative' | 'negative' | 'mixed'
export type Audience = 'child' | 'adult'
export type CommunicationInputExpectedLang = 'ru' | 'en'

export type LevelId =
  | 'all'
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
  /** Выбранные времена (несколько — ИИ выбирает одно на каждый запрос). */
  tenses: TenseId[]
  audience: Audience
  voiceId: string
  /** Режим «Общение»: ожидаемый язык следующего ввода (tie-break для пустого/безбуквенного текста). */
  communicationInputExpectedLang: CommunicationInputExpectedLang
}

export interface UsageInfo {
  used: number
  limit: number
}

export interface StoredState {
  messages: ChatMessage[]
  settings: Settings
}
