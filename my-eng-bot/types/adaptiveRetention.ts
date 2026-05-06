import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import type { Audience, LevelId } from '@/lib/types'
import type { VocabularyWorldId } from '@/types/vocabulary'

export type AdaptiveAudienceSegment = 'child' | 'teen' | 'adult' | 'unknown'

export type AdaptiveActionKind =
  | 'return_flow'
  | 'srs_review'
  | 'custom_pack'
  | 'topic_pack'
  | 'weak_spot'
  | 'continue_world'
  | 'quick_start'
  | 'practice'
  | 'chat'
  | 'finish_today'

export type AdaptiveActionTarget =
  | { kind: 'daily_hub' }
  | { kind: 'vocabulary'; worldId?: VocabularyWorldId }
  | { kind: 'practice'; customTopic?: string }
  | { kind: 'chat' }
  | { kind: 'topic_pack'; packId: string }
  | { kind: 'custom_pack'; packId: string }
  | { kind: 'return_flow' }

export interface AdaptiveFooterView {
  dynamicText: string
  staticText: string
  typingKey: string
  tone: FooterVoiceTone
  emphasis: FooterVoiceEmphasis
}

export interface TopicGoalPack {
  id: string
  title: string
  goal: string
  audience: AdaptiveAudienceSegment[]
  minLevel: LevelId
  estimatedMinutes: number
  worldIds: VocabularyWorldId[]
  tags: string[]
  phraseTemplates: string[]
  practiceModes: string[]
  successCriteria: string
}

export type CustomWordPackSource = 'manual' | 'paste' | 'excel' | 'word' | 'ai-assisted'

export interface CustomWordItem {
  id: string
  en: string
  ru: string
  example?: string
  topic?: string
}

export interface CustomWordPack {
  id: string
  title: string
  source: CustomWordPackSource
  createdAt: number
  updatedAt: number
  items: CustomWordItem[]
}

export interface WeakSpot {
  id: string
  label: string
  reason: string
  severity: 'low' | 'medium' | 'high'
  actionHint: string
}

export interface LearnerSnapshot {
  generatedAt: number
  audience: Audience
  segment: AdaptiveAudienceSegment
  level: LevelId
  daysSinceLastActive: number | null
  hasAnyHistory: boolean
  vocabulary: {
    coins: number
    streak: number
    completedSessions: number
    unlockedWorldIds: VocabularyWorldId[]
    dueWordCount: number
    learnedWordCount: number
    weakWordCount: number
  }
  practice: {
    completedSessions: number
    lastCompletedAt: number | null
    weakAnswerCount: number
  }
  lessons: {
    completedLessons: number
    lastCompletedAt: number | null
  }
  customPacks: {
    total: number
    latestPackId: string | null
    latestPackTitle: string | null
  }
  weakSpots: WeakSpot[]
}

export interface NextBestAction {
  id: string
  kind: AdaptiveActionKind
  title: string
  description: string
  reason: string
  primaryCta: string
  target: AdaptiveActionTarget
  footer: AdaptiveFooterView
  priority: number
}

export interface DailyPlan {
  generatedAt: number
  greeting: string
  primaryAction: NextBestAction
  secondaryActions: NextBestAction[]
  topicPacks: TopicGoalPack[]
  footer: AdaptiveFooterView
}

export type CompletionContextKind =
  | 'vocabulary'
  | 'knowledge_check'
  | 'custom_pack'
  | 'return_flow'
  | 'practice'
  | 'topic_pack'

export interface CompletionContext {
  kind: CompletionContextKind
  title: string
  hadErrors: boolean
  hasDueWords: boolean
  activeGoalTitle?: string | null
  sessionMinutes?: number
  audience: Audience
}

export interface CompletionOption {
  id: string
  title: string
  description: string
  kind: AdaptiveActionKind
  target: AdaptiveActionTarget
  primary?: boolean
}

export interface AdaptiveEvent {
  eventName: string
  occurredAt: number
  source: 'dailyHub' | 'vocabulary' | 'practice' | 'lesson' | 'chat' | 'returnFlow' | 'customPack'
  audience: AdaptiveAudienceSegment
  level: LevelId
  goalPackId?: string
  actionId?: string
  result: 'shown' | 'clicked' | 'started' | 'completed' | 'skipped' | 'failed'
  durationMs?: number
  metadata?: Record<string, string | number | boolean | null>
}
