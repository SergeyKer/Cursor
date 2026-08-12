import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getVocabTtsEnginePref, setVocabTtsEnginePref } from '@/lib/vocabulary/ttsEnginePref'
import { getVocabTtsVoicePref, setVocabTtsVoicePref } from '@/lib/vocabulary/ttsVoicePref'
import {
  getVocabTtsRotationModePref,
  getVocabTtsShuffleRemaining,
  setVocabTtsRotationModePref,
  setVocabTtsShuffleRemaining,
} from '@/lib/vocabulary/ttsRotationPref'
import { getCommunicationTtsEnginePref, setCommunicationTtsEnginePref } from '@/lib/communication/ttsEnginePref'
import { getCommunicationAutoTtsPref, setCommunicationAutoTtsPref } from '@/lib/communication/autoTtsPref'
import {
  getCommunicationTtsRotationModePref,
  getCommunicationTtsShuffleRemaining,
  setCommunicationTtsShuffleRemaining,
} from '@/lib/communication/ttsRotationPref'
import { ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY } from '@/lib/engvo/constants'

describe('tts prefs isolation', () => {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('window', { localStorage: localStorageMock })
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults vocab grok/luna and communication system/auto off', () => {
    expect(getVocabTtsEnginePref()).toBe('grok')
    expect(getVocabTtsVoicePref()).toBe('luna')
    expect(getVocabTtsRotationModePref()).toBe('none')
    expect(getCommunicationTtsEnginePref()).toBe('system')
    expect(getCommunicationAutoTtsPref()).toBe(false)
    expect(getCommunicationTtsRotationModePref()).toBe('none')
  })

  it('keeps vocab shuffle bag off the call shuffle key', () => {
    setVocabTtsShuffleRemaining(['eve', 'leo'])
    expect(getVocabTtsShuffleRemaining()).toEqual(['eve', 'leo'])
    expect(store.has(ENGVO_XAI_VOICE_SHUFFLE_REMAINING_STORAGE_KEY)).toBe(false)
    setCommunicationTtsShuffleRemaining(['ara'])
    expect(getCommunicationTtsShuffleRemaining()).toEqual(['ara'])
    expect(getVocabTtsShuffleRemaining()).toEqual(['eve', 'leo'])
  })

  it('persists communication auto tts and engine', () => {
    setCommunicationAutoTtsPref(true)
    expect(getCommunicationAutoTtsPref()).toBe(true)
    setCommunicationTtsEnginePref('grok')
    expect(getCommunicationTtsEnginePref()).toBe('grok')
    setVocabTtsEnginePref('system')
    expect(getVocabTtsEnginePref()).toBe('system')
    expect(getCommunicationTtsEnginePref()).toBe('grok')
  })

  it('persists vocab rotation independently', () => {
    setVocabTtsRotationModePref('random')
    expect(getVocabTtsRotationModePref()).toBe('random')
    expect(getCommunicationTtsRotationModePref()).toBe('none')
  })
})
