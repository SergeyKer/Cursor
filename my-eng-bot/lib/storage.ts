import type { StoredState, Settings, ChatMessage } from './types'

const STORAGE_KEY = 'my-eng-bot-state'
export const OPENROUTER_KEY_STORAGE = 'my-eng-bot-openrouter-key'
const USAGE_COUNT_STORAGE = 'my-eng-bot-usage-today'

const LEGACY_STORAGE_KEY = 'eng-bot-state'
const LEGACY_OPENROUTER_KEY = 'eng-bot-openrouter-key'
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
    if (!localStorage.getItem(OPENROUTER_KEY_STORAGE)) {
      const legacy = localStorage.getItem(LEGACY_OPENROUTER_KEY)
      if (legacy) {
        localStorage.setItem(OPENROUTER_KEY_STORAGE, legacy)
        localStorage.removeItem(LEGACY_OPENROUTER_KEY)
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
  mode: 'dialogue',
  sentenceType: 'mixed',
  topic: 'free_talk',
  level: 'a1',
  tense: 'present_simple',
  voiceId: '',
}

export function loadState(): StoredState {
  if (typeof window === 'undefined') {
    return { messages: [], settings: DEFAULT_SETTINGS }
  }
  migrateStorageIfNeeded()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { messages: [], settings: DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as StoredState
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
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

export function getOpenRouterKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = localStorage.getItem(OPENROUTER_KEY_STORAGE) ?? ''
    return raw.trim()
  } catch {
    return ''
  }
}

export function setOpenRouterKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = key.trim().split(/[\r\n]/)[0].trim()
    if (trimmed) localStorage.setItem(OPENROUTER_KEY_STORAGE, trimmed)
    else localStorage.removeItem(OPENROUTER_KEY_STORAGE)
  } catch {
    // ignore
  }
}

export { DEFAULT_SETTINGS }
