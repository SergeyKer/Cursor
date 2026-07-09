import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHAT_PATTERN_STORAGE_KEY,
  DEFAULT_CHAT_PATTERN,
  getChatPatternLabel,
  isChatPatternId,
  loadChatPattern,
  saveChatPattern,
  type ChatPatternId,
} from '@/lib/chatPattern'

function stubLocalStorage() {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
  vi.stubGlobal('window', {} as Window & typeof globalThis)
  vi.stubGlobal('localStorage', localStorageMock)
  return store
}

describe('chatPattern', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to none', () => {
    expect(DEFAULT_CHAT_PATTERN).toBe('none')
  })

  it('validates known pattern ids', () => {
    expect(isChatPatternId('none')).toBe(true)
    expect(isChatPatternId('study-doodles')).toBe(true)
    expect(isChatPatternId('cosmos')).toBe(true)
    expect(isChatPatternId('unknown')).toBe(false)
  })

  it('returns labels for menu display', () => {
    expect(getChatPatternLabel('none')).toBe('Нет')
    expect(getChatPatternLabel('study-doodles')).toBe('Учебные мелочи')
    expect(getChatPatternLabel('cosmos')).toBe('Космос')
  })

  it('loads and saves pattern preference', () => {
    const ids: ChatPatternId[] = ['none', 'study-doodles', 'cosmos']
    for (const id of ids) {
      saveChatPattern(id)
      expect(loadChatPattern()).toBe(id)
    }
    expect(localStorage.getItem(CHAT_PATTERN_STORAGE_KEY)).toBe('cosmos')
  })

  it('falls back to none for invalid stored value', () => {
    localStorage.setItem(CHAT_PATTERN_STORAGE_KEY, 'invalid-pattern')
    expect(loadChatPattern()).toBe('none')
  })
})
