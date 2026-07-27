/**
 * Per-mode chat settings (dialogue ⟂ translation).
 * Isolates tenses / sentenceType / level / topic so switching modes
 * restores that mode's last slice instead of leaking the other mode's picks.
 */

import type { LevelId, SentenceType, Settings, TopicId, TenseId, AppMode } from '@/lib/types'

export const MODE_SETTINGS_STORAGE_KEY = 'my-eng-bot-mode-settings-v1'

export type ModeSettingsSlice = {
  tenses: TenseId[]
  sentenceType: SentenceType
  level: LevelId
  topic: TopicId
}

export type ChatModeWithSlice = 'dialogue' | 'translation'

export type ModeSettingsStore = {
  migrationDone: boolean
  dialogue: ModeSettingsSlice
  translation: ModeSettingsSlice
}

const DEFAULT_SLICE: ModeSettingsSlice = {
  tenses: ['present_simple'],
  sentenceType: 'mixed',
  level: 'a1',
  topic: 'free_talk',
}

const KNOWN_SENTENCE = new Set<SentenceType>(['general', 'interrogative', 'negative', 'mixed'])
const KNOWN_LEVEL = new Set<LevelId>(['all', 'starter', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'])

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function extractModeSlice(settings: Pick<Settings, 'tenses' | 'sentenceType' | 'level' | 'topic'>): ModeSettingsSlice {
  const tenses = Array.isArray(settings.tenses)
    ? (settings.tenses.filter((t): t is TenseId => typeof t === 'string') as TenseId[])
    : [...DEFAULT_SLICE.tenses]
  return {
    tenses: tenses.length > 0 ? tenses : [...DEFAULT_SLICE.tenses],
    sentenceType: KNOWN_SENTENCE.has(settings.sentenceType) ? settings.sentenceType : DEFAULT_SLICE.sentenceType,
    level: KNOWN_LEVEL.has(settings.level) ? settings.level : DEFAULT_SLICE.level,
    topic: typeof settings.topic === 'string' && settings.topic ? settings.topic : DEFAULT_SLICE.topic,
  }
}

export function applyModeSlice<T extends Settings>(settings: T, slice: ModeSettingsSlice): T {
  return {
    ...settings,
    tenses: [...slice.tenses],
    sentenceType: slice.sentenceType,
    level: slice.level,
    topic: slice.topic,
  }
}

export function isChatModeWithSlice(mode: AppMode | string): mode is ChatModeWithSlice {
  return mode === 'dialogue' || mode === 'translation'
}

export function sanitizeModeSlice(raw: unknown): ModeSettingsSlice {
  if (!isRecord(raw)) return { ...DEFAULT_SLICE, tenses: [...DEFAULT_SLICE.tenses] }
  return extractModeSlice({
    tenses: Array.isArray(raw.tenses) ? (raw.tenses as TenseId[]) : DEFAULT_SLICE.tenses,
    sentenceType: raw.sentenceType as SentenceType,
    level: raw.level as LevelId,
    topic: raw.topic as TopicId,
  })
}

export function createSeededModeSettingsStore(settings: Settings): ModeSettingsStore {
  const seed = extractModeSlice(settings)
  return {
    migrationDone: true,
    dialogue: { ...seed, tenses: [...seed.tenses] },
    translation: { ...seed, tenses: [...seed.tenses] },
  }
}

export function loadModeSettingsStore(): ModeSettingsStore | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MODE_SETTINGS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return null
    return {
      migrationDone: Boolean(parsed.migrationDone),
      dialogue: sanitizeModeSlice(parsed.dialogue),
      translation: sanitizeModeSlice(parsed.translation),
    }
  } catch {
    return null
  }
}

export function saveModeSettingsStore(store: ModeSettingsStore): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MODE_SETTINGS_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore quota / private mode
  }
}

/** Ensure store exists; seed both slices from settings once. */
export function ensureModeSettingsStore(settings: Settings): ModeSettingsStore {
  const existing = loadModeSettingsStore()
  if (existing?.migrationDone) return existing
  const seeded = createSeededModeSettingsStore(settings)
  saveModeSettingsStore(seeded)
  return seeded
}

/** Persist active mode slice; no-op for communication. */
export function persistActiveModeSlice(settings: Settings): ModeSettingsStore {
  const store = ensureModeSettingsStore(settings)
  if (!isChatModeWithSlice(settings.mode)) {
    saveModeSettingsStore(store)
    return store
  }
  const next: ModeSettingsStore = {
    ...store,
    migrationDone: true,
    [settings.mode]: extractModeSlice(settings),
  }
  saveModeSettingsStore(next)
  return next
}

/**
 * On dialogue↔translation switch: flush outgoing mode, restore incoming slice.
 * communication and same-mode patches pass through with persist of active (if chat mode).
 */
export function applySettingsWithModeSlice(prev: Settings, nextRaw: Settings): Settings {
  const nextMode = nextRaw.mode
  const prevMode = prev.mode

  if (
    isChatModeWithSlice(prevMode) &&
    isChatModeWithSlice(nextMode) &&
    prevMode !== nextMode
  ) {
    const store = ensureModeSettingsStore(prev)
    const flushed: ModeSettingsStore = {
      ...store,
      migrationDone: true,
      [prevMode]: extractModeSlice(prev),
    }
    const restored = applyModeSlice(nextRaw, flushed[nextMode])
    const withMode: Settings = { ...restored, mode: nextMode }
    // Keep translation-only fields from nextRaw (drill kind / lesson) when entering translation
    if (nextMode === 'translation') {
      withMode.translationDrillKind = nextRaw.translationDrillKind ?? withMode.translationDrillKind
      withMode.translationLessonId =
        nextRaw.translationLessonId !== undefined
          ? nextRaw.translationLessonId
          : withMode.translationLessonId
    }
    saveModeSettingsStore({
      ...flushed,
      [nextMode]: extractModeSlice(withMode),
    })
    return withMode
  }

  persistActiveModeSlice(nextRaw)
  return nextRaw
}
