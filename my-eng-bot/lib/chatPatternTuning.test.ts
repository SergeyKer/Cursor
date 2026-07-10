import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyChatPatternState,
  applyChatPatternTuningToDocument,
  CHAT_PATTERN_TUNING_STORAGE_KEY,
  clearChatPatternTuningVars,
  DEFAULT_CHAT_PATTERN_TUNING_BY_ID,
  getDefaultChatPatternTuning,
  loadChatPatternTuningMap,
  normalizeChatPatternTuning,
  resolveChatPatternTuning,
  saveChatPatternTuningMap,
} from '@/lib/chatPatternTuning'

const SHARED_DEFAULT = {
  tileWidthPx: 230,
  opacity: 0.06,
  glassOpacity: 0.06,
  blendMode: 'multiply' as const,
}

function stubBrowser() {
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
  const style = new Map<string, string>()
  const documentMock = {
    documentElement: {
      style: {
        setProperty: (name: string, value: string) => {
          style.set(name, value)
        },
        removeProperty: (name: string) => {
          style.delete(name)
        },
      },
      setAttribute: vi.fn(),
    },
  }
  vi.stubGlobal('window', {} as Window & typeof globalThis)
  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('document', documentMock)
  return { store, style, documentMock }
}

describe('chatPatternTuning', () => {
  beforeEach(() => {
    stubBrowser()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns shared defaults for all patterns', () => {
    expect(getDefaultChatPatternTuning('study-doodles')).toEqual(SHARED_DEFAULT)
    expect(getDefaultChatPatternTuning('cosmos')).toEqual(SHARED_DEFAULT)
    expect(getDefaultChatPatternTuning('animals')).toEqual({
      ...SHARED_DEFAULT,
      tileWidthPx: 300,
    })
    expect(DEFAULT_CHAT_PATTERN_TUNING_BY_ID['study-doodles']).toEqual(SHARED_DEFAULT)
    expect(DEFAULT_CHAT_PATTERN_TUNING_BY_ID.cosmos).toEqual(SHARED_DEFAULT)
    expect(DEFAULT_CHAT_PATTERN_TUNING_BY_ID.animals).toEqual({
      ...SHARED_DEFAULT,
      tileWidthPx: 300,
    })
  })

  it('clamps tuning values to allowed ranges', () => {
    expect(
      normalizeChatPatternTuning({
        tileWidthPx: 50,
        opacity: 0,
        glassOpacity: 1,
        blendMode: 'invalid' as never,
      })
    ).toEqual({
      tileWidthPx: 120,
      opacity: 0.01,
      glassOpacity: 0.4,
      blendMode: 'multiply',
    })
  })

  it('resolves stored tuning with defaults as fallback', () => {
    const map = {
      'study-doodles': {
        tileWidthPx: 220,
        opacity: 0.2,
      },
    }
    expect(resolveChatPatternTuning(map, 'study-doodles')).toEqual({
      tileWidthPx: 220,
      opacity: 0.2,
      glassOpacity: 0.06,
      blendMode: 'multiply',
    })
  })

  it('ignores v1 legacy default tuning in storage', () => {
    saveChatPatternTuningMap({
      'study-doodles': {
        tileWidthPx: 300,
        opacity: 0.14,
        glassOpacity: 0.1,
        blendMode: 'multiply',
      },
    })
    expect(loadChatPatternTuningMap()).toEqual({})
    expect(resolveChatPatternTuning({}, 'study-doodles')).toEqual(SHARED_DEFAULT)
  })

  it('ignores previous 190px default tuning in storage', () => {
    saveChatPatternTuningMap({
      'study-doodles': {
        tileWidthPx: 190,
        opacity: 0.06,
        glassOpacity: 0.04,
        blendMode: 'multiply',
      },
    })
    expect(loadChatPatternTuningMap()).toEqual({})
    expect(resolveChatPatternTuning({}, 'study-doodles')).toEqual(SHARED_DEFAULT)
  })

  it('keeps custom tuning that is not a legacy default', () => {
    const map = {
      'study-doodles': {
        tileWidthPx: 260,
        opacity: 0.18,
        glassOpacity: 0.12,
        blendMode: 'overlay' as const,
      },
    }
    saveChatPatternTuningMap(map)
    expect(loadChatPatternTuningMap()).toEqual(map)
    expect(localStorage.getItem(CHAT_PATTERN_TUNING_STORAGE_KEY)).toContain('"study-doodles"')
  })

  it('applies css vars for active pattern and clears them for none', () => {
    const { style } = stubBrowser()
    applyChatPatternTuningToDocument('study-doodles', {
      tileWidthPx: 280,
      opacity: 0.16,
      glassOpacity: 0.11,
      blendMode: 'screen',
    })
    expect(style.get('--chat-pattern-tile-width')).toBe('280px')
    expect(style.get('--chat-pattern-opacity')).toBe('0.16')
    expect(style.get('--chat-pattern-glass-opacity')).toBe('0.11')
    expect(style.get('--chat-pattern-blend-mode')).toBe('screen')

    applyChatPatternState('none', {})
    expect(style.has('--chat-pattern-tile-width')).toBe(false)
    clearChatPatternTuningVars()
    expect(style.size).toBe(0)
  })
})
