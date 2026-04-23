import type { StoredState, Settings, ChatMessage, TenseId } from './types'

const STORAGE_KEY = 'my-eng-bot-state'
const USAGE_COUNT_STORAGE = 'my-eng-bot-usage-today'
const FREE_TALK_TOPIC_ROTATION_STORAGE = 'my-eng-bot-free-talk-topic-rotation'

const LEGACY_STORAGE_KEY = 'eng-bot-state'
const LEGACY_USAGE_KEY = 'eng-bot-usage-today'

function migrateStorageIfNeeded(): void {
  if (typeof window === 'undefined') return
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }
    if (!localStorage.getItem(USAGE_COUNT_STORAGE)) {
      const legacy = localStorage.getItem(LEGACY_USAGE_KEY)
      if (legacy) {
        localStorage.setItem(USAGE_COUNT_STORAGE, legacy)
        localStorage.removeItem(LEGACY_USAGE_KEY)
      }
    }
  } catch {
    // ignore
  }
}

const DEFAULT_SETTINGS: Settings = {
  provider: 'openrouter',
  openAiChatPreset: 'gpt-4o-mini',
  mode: 'dialogue',
  sentenceType: 'mixed',
  topic: 'free_talk',
  level: 'a1',
  tenses: ['present_simple'],
  audience: 'adult',
  voiceId: '',
  communicationInputExpectedLang: 'en',
}

export function loadState(): StoredState {
  if (typeof window === 'undefined') {
    return { messages: [], settings: DEFAULT_SETTINGS }
  }
  migrateStorageIfNeeded()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { messages: [], settings: DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as StoredState & { settings?: { tense?: string; tenses?: string[] } }
    const merged = { ...DEFAULT_SETTINGS, ...parsed.settings }
    if (!Array.isArray(merged.tenses) && 'tense' in parsed.settings && typeof parsed.settings.tense === 'string') {
      merged.tenses = [parsed.settings.tense as TenseId]
    }
    if ('tense' in merged) delete (merged as Record<string, unknown>).tense
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      settings: merged as Settings,
    }
  } catch {
    return { messages: [], settings: DEFAULT_SETTINGS }
  }
}

export function saveState(messages: ChatMessage[], settings: Settings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ messages, settings })
    )
  } catch {
    // ignore
  }
}

function todayKey(): string {
  if (typeof window === 'undefined') return ''
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

export function getUsageCountToday(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(USAGE_COUNT_STORAGE)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { date: string; count: number }
    if (parsed.date !== todayKey()) return 0
    return typeof parsed.count === 'number' ? Math.max(0, parsed.count) : 0
  } catch {
    return 0
  }
}

export function incrementUsageToday(): void {
  if (typeof window === 'undefined') return
  try {
    const date = todayKey()
    const raw = localStorage.getItem(USAGE_COUNT_STORAGE)
    let count = 0
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; count: number }
      if (parsed.date === date) count = typeof parsed.count === 'number' ? parsed.count : 0
    }
    localStorage.setItem(USAGE_COUNT_STORAGE, JSON.stringify({ date, count: count + 1 }))
  } catch {
    // ignore
  }
}

export interface FreeTalkTopicRotationAudienceState {
  launchIndex: number
  lastShownLaunch: Record<string, number>
}

export interface FreeTalkTopicRotationState {
  child: FreeTalkTopicRotationAudienceState
  adult: FreeTalkTopicRotationAudienceState
}

function createEmptyAudienceRotationState(): FreeTalkTopicRotationAudienceState {
  return { launchIndex: 0, lastShownLaunch: {} }
}

function createDefaultFreeTalkTopicRotationState(): FreeTalkTopicRotationState {
  return {
    child: createEmptyAudienceRotationState(),
    adult: createEmptyAudienceRotationState(),
  }
}

function sanitizeAudienceRotationState(
  value: unknown
): FreeTalkTopicRotationAudienceState {
  const src = value as Partial<FreeTalkTopicRotationAudienceState> | null
  const launchIndex =
    typeof src?.launchIndex === 'number' && Number.isFinite(src.launchIndex) && src.launchIndex >= 0
      ? Math.floor(src.launchIndex)
      : 0
  const rawMap = src?.lastShownLaunch
  const lastShownLaunch: Record<string, number> = {}
  if (rawMap && typeof rawMap === 'object') {
    for (const [topic, launch] of Object.entries(rawMap as Record<string, unknown>)) {
      if (
        typeof launch === 'number' &&
        Number.isFinite(launch) &&
        launch >= 0
      ) {
        lastShownLaunch[topic] = Math.floor(launch)
      }
    }
  }
  return { launchIndex, lastShownLaunch }
}

export function loadFreeTalkTopicRotationState(): FreeTalkTopicRotationState {
  if (typeof window === 'undefined') return createDefaultFreeTalkTopicRotationState()
  try {
    const raw = localStorage.getItem(FREE_TALK_TOPIC_ROTATION_STORAGE)
    if (!raw) return createDefaultFreeTalkTopicRotationState()
    const parsed = JSON.parse(raw) as Partial<FreeTalkTopicRotationState>
    return {
      child: sanitizeAudienceRotationState(parsed.child),
      adult: sanitizeAudienceRotationState(parsed.adult),
    }
  } catch {
    return createDefaultFreeTalkTopicRotationState()
  }
}

export function saveFreeTalkTopicRotationState(state: FreeTalkTopicRotationState): void {
  if (typeof window === 'undefined') return
  try {
    const normalized: FreeTalkTopicRotationState = {
      child: sanitizeAudienceRotationState(state.child),
      adult: sanitizeAudienceRotationState(state.adult),
    }
    localStorage.setItem(FREE_TALK_TOPIC_ROTATION_STORAGE, JSON.stringify(normalized))
  } catch {
    // ignore
  }
}

export { DEFAULT_SETTINGS }
