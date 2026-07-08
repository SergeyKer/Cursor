import {
  applyChatPatternToDocument,
  CHAT_PATTERN_IDS,
  type ChatPatternId,
  isChatPatternId,
} from '@/lib/chatPattern'

export type TunableChatPatternId = Exclude<ChatPatternId, 'none'>

export type ChatPatternBlendMode =
  | 'normal'
  | 'multiply'
  | 'soft-light'
  | 'overlay'
  | 'screen'
  | 'darken'

export type ChatPatternTuning = {
  tileWidthPx: number
  opacity: number
  glassOpacity: number
  blendMode: ChatPatternBlendMode
}

export const CHAT_PATTERN_BLEND_MODE_OPTIONS: ReadonlyArray<{
  id: ChatPatternBlendMode
  label: string
}> = [
  { id: 'multiply', label: 'Multiply' },
  { id: 'soft-light', label: 'Soft light' },
  { id: 'normal', label: 'Normal' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'screen', label: 'Screen' },
  { id: 'darken', label: 'Darken' },
]

/** Старые дефолты v1 — мигрируем на новые, если пользователь их не менял. */
const LEGACY_CHAT_PATTERN_TUNING_BY_ID: Record<TunableChatPatternId, ChatPatternTuning> = {
  'study-doodles': {
    tileWidthPx: 300,
    opacity: 0.14,
    glassOpacity: 0.1,
    blendMode: 'multiply',
  },
}

export const DEFAULT_CHAT_PATTERN_TUNING_BY_ID: Record<TunableChatPatternId, ChatPatternTuning> = {
  'study-doodles': {
    tileWidthPx: 190,
    opacity: 0.06,
    glassOpacity: 0.04,
    blendMode: 'multiply',
  },
}

export type ChatPatternTuningMap = Partial<Record<TunableChatPatternId, ChatPatternTuning>>

export const CHAT_PATTERN_TUNING_STORAGE_KEY = 'myeng-chat-pattern-tuning-v1'

const TUNABLE_PATTERN_IDS = CHAT_PATTERN_IDS.filter((id): id is TunableChatPatternId => id !== 'none')

const TILE_WIDTH_MIN = 120
const TILE_WIDTH_MAX = 500
const TILE_WIDTH_STEP = 10
const OPACITY_MIN = 0.01
const OPACITY_MAX = 0.4
const OPACITY_STEP = 0.01

const BLEND_MODES = new Set<ChatPatternBlendMode>(
  CHAT_PATTERN_BLEND_MODE_OPTIONS.map((option) => option.id)
)

const CSS_VAR_NAMES = [
  '--chat-pattern-tile-width',
  '--chat-pattern-opacity',
  '--chat-pattern-glass-opacity',
  '--chat-pattern-blend-mode',
] as const

export function isTunableChatPatternId(id: ChatPatternId): id is TunableChatPatternId {
  return id !== 'none'
}

export function getDefaultChatPatternTuning(id: TunableChatPatternId): ChatPatternTuning {
  return { ...DEFAULT_CHAT_PATTERN_TUNING_BY_ID[id] }
}

export function normalizeChatPatternTuning(
  raw: Partial<ChatPatternTuning> | null | undefined,
  fallback: ChatPatternTuning = DEFAULT_CHAT_PATTERN_TUNING_BY_ID['study-doodles']
): ChatPatternTuning {
  const tileWidthRaw = Number(raw?.tileWidthPx ?? fallback.tileWidthPx)
  const opacityRaw = Number(raw?.opacity ?? fallback.opacity)
  const glassOpacityRaw = Number(raw?.glassOpacity ?? fallback.glassOpacity)
  const blendModeRaw = raw?.blendMode ?? fallback.blendMode

  const tileWidthPx = Math.min(
    TILE_WIDTH_MAX,
    Math.max(TILE_WIDTH_MIN, Math.round(tileWidthRaw / TILE_WIDTH_STEP) * TILE_WIDTH_STEP)
  )
  const opacity = Math.min(
    OPACITY_MAX,
    Math.max(OPACITY_MIN, Math.round(opacityRaw / OPACITY_STEP) * OPACITY_STEP)
  )
  const glassOpacity = Math.min(
    OPACITY_MAX,
    Math.max(OPACITY_MIN, Math.round(glassOpacityRaw / OPACITY_STEP) * OPACITY_STEP)
  )
  const blendMode = BLEND_MODES.has(blendModeRaw as ChatPatternBlendMode)
    ? (blendModeRaw as ChatPatternBlendMode)
    : fallback.blendMode

  return { tileWidthPx, opacity, glassOpacity, blendMode }
}

export function resolveChatPatternTuning(
  map: ChatPatternTuningMap,
  id: TunableChatPatternId
): ChatPatternTuning {
  const stored = map[id]
  return normalizeChatPatternTuning(stored, getDefaultChatPatternTuning(id))
}

function isLegacyDefaultTuning(id: TunableChatPatternId, tuning: ChatPatternTuning): boolean {
  const legacy = LEGACY_CHAT_PATTERN_TUNING_BY_ID[id]
  return (
    tuning.tileWidthPx === legacy.tileWidthPx &&
    tuning.opacity === legacy.opacity &&
    tuning.glassOpacity === legacy.glassOpacity &&
    tuning.blendMode === legacy.blendMode
  )
}

function sanitizeTuningMap(raw: unknown): ChatPatternTuningMap {
  if (!raw || typeof raw !== 'object') return {}
  const result: ChatPatternTuningMap = {}
  for (const id of TUNABLE_PATTERN_IDS) {
    const value = (raw as Record<string, unknown>)[id]
    if (!value || typeof value !== 'object') continue
    const normalized = normalizeChatPatternTuning(value as Partial<ChatPatternTuning>, getDefaultChatPatternTuning(id))
    if (isLegacyDefaultTuning(id, normalized)) continue
    result[id] = normalized
  }
  return result
}

export function loadChatPatternTuningMap(): ChatPatternTuningMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CHAT_PATTERN_TUNING_STORAGE_KEY)
    if (!raw) return {}
    return sanitizeTuningMap(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function saveChatPatternTuningMap(map: ChatPatternTuningMap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHAT_PATTERN_TUNING_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function clearChatPatternTuningVars(): void {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  for (const name of CSS_VAR_NAMES) {
    style.removeProperty(name)
  }
}

export function applyChatPatternTuningToDocument(
  _patternId: TunableChatPatternId,
  tuning: ChatPatternTuning
): void {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  style.setProperty('--chat-pattern-tile-width', `${tuning.tileWidthPx}px`)
  style.setProperty('--chat-pattern-opacity', String(tuning.opacity))
  style.setProperty('--chat-pattern-glass-opacity', String(tuning.glassOpacity))
  style.setProperty('--chat-pattern-blend-mode', tuning.blendMode)
}

export function applyChatPatternState(
  patternId: ChatPatternId,
  tuningMap: ChatPatternTuningMap
): void {
  applyChatPatternToDocument(patternId)
  if (patternId === 'none') {
    clearChatPatternTuningVars()
    return
  }
  applyChatPatternTuningToDocument(patternId, resolveChatPatternTuning(tuningMap, patternId))
}

export function formatChatPatternTuningLabel(tuning: ChatPatternTuning): string {
  return `${tuning.tileWidthPx}px · ${Math.round(tuning.opacity * 100)}%`
}

export function isChatPatternBlendMode(value: unknown): value is ChatPatternBlendMode {
  return typeof value === 'string' && BLEND_MODES.has(value as ChatPatternBlendMode)
}

export const CHAT_PATTERN_TUNING_LIMITS = {
  tileWidthPx: { min: TILE_WIDTH_MIN, max: TILE_WIDTH_MAX, step: TILE_WIDTH_STEP },
  opacity: { min: OPACITY_MIN, max: OPACITY_MAX, step: OPACITY_STEP },
  glassOpacity: { min: OPACITY_MIN, max: OPACITY_MAX, step: OPACITY_STEP },
} as const

export function isValidTuningStoragePayload(value: unknown): value is ChatPatternTuningMap {
  if (!value || typeof value !== 'object') return false
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isChatPatternId(key) || key === 'none') return false
    if (!entry || typeof entry !== 'object') return false
  }
  return true
}
