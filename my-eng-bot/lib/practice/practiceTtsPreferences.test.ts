import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDefaultTtsSpeechRate,
  isPracticeTtsSpeedIndex,
  loadPracticeTtsSpeedDefaultIndex,
  PRACTICE_TTS_SPEED_STORAGE_KEY,
  resolveEffectivePracticeTtsSpeedIndex,
  savePracticeTtsSpeedDefaultIndex,
} from '@/lib/practice/practiceTtsPreferences'

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

describe('practiceTtsPreferences', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates speed index range', () => {
    expect(isPracticeTtsSpeedIndex(0)).toBe(true)
    expect(isPracticeTtsSpeedIndex(2)).toBe(true)
    expect(isPracticeTtsSpeedIndex(3)).toBe(false)
    expect(isPracticeTtsSpeedIndex(-1)).toBe(false)
  })

  it('loads default index 0 when storage is empty', () => {
    expect(loadPracticeTtsSpeedDefaultIndex()).toBe(0)
    expect(getDefaultTtsSpeechRate()).toBe(1)
  })

  it('persists and loads default index', () => {
    savePracticeTtsSpeedDefaultIndex(1)
    expect(localStorage.getItem(PRACTICE_TTS_SPEED_STORAGE_KEY)).toBe('1')
    expect(loadPracticeTtsSpeedDefaultIndex()).toBe(1)
    expect(getDefaultTtsSpeechRate()).toBe(0.8)
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem(PRACTICE_TTS_SPEED_STORAGE_KEY, '9')
    expect(loadPracticeTtsSpeedDefaultIndex()).toBe(0)
  })

  it('resolveEffectivePracticeTtsSpeedIndex prefers session override', () => {
    expect(resolveEffectivePracticeTtsSpeedIndex(null, 1)).toBe(1)
    expect(resolveEffectivePracticeTtsSpeedIndex(2, 1)).toBe(2)
    expect(resolveEffectivePracticeTtsSpeedIndex(99, 1)).toBe(1)
  })
})
