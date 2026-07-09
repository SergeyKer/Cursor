export const CHAT_PATTERN_IDS = ['none', 'study-doodles', 'cosmos'] as const

export type ChatPatternId = (typeof CHAT_PATTERN_IDS)[number]

export const CHAT_PATTERN_STORAGE_KEY = 'myeng-chat-pattern'

export const DEFAULT_CHAT_PATTERN: ChatPatternId = 'none'

export const CHAT_PATTERN_OPTIONS: ReadonlyArray<{ id: ChatPatternId; name: string }> = [
  { id: 'none', name: 'Нет' },
  { id: 'study-doodles', name: 'Учебные мелочи' },
  { id: 'cosmos', name: 'Космос' },
]

export const CHAT_PATTERN_ASSET_BY_ID = {
  'study-doodles': '/patterns/study-doodles.png',
  cosmos: '/patterns/cosmos.png',
} as const satisfies Record<Exclude<ChatPatternId, 'none'>, string>

export function isChatPatternId(value: unknown): value is ChatPatternId {
  return typeof value === 'string' && (CHAT_PATTERN_IDS as readonly string[]).includes(value)
}

export function getChatPatternLabel(id: ChatPatternId): string {
  return CHAT_PATTERN_OPTIONS.find((option) => option.id === id)?.name ?? CHAT_PATTERN_OPTIONS[0].name
}

export function loadChatPattern(): ChatPatternId {
  if (typeof window === 'undefined') return DEFAULT_CHAT_PATTERN
  try {
    const raw = localStorage.getItem(CHAT_PATTERN_STORAGE_KEY)?.trim() ?? ''
    return isChatPatternId(raw) ? raw : DEFAULT_CHAT_PATTERN
  } catch {
    return DEFAULT_CHAT_PATTERN
  }
}

export function saveChatPattern(id: ChatPatternId): void {
  if (typeof window === 'undefined') return
  if (!isChatPatternId(id)) return
  try {
    localStorage.setItem(CHAT_PATTERN_STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

export function applyChatPatternToDocument(id: ChatPatternId): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-chat-pattern', id)
}
