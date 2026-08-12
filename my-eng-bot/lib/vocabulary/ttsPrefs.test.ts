import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getVocabTtsEnginePref, setVocabTtsEnginePref } from '@/lib/vocabulary/ttsEnginePref'
import { getVocabTtsVoicePref, setVocabTtsVoicePref } from '@/lib/vocabulary/ttsVoicePref'

describe('vocab tts prefs', () => {
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

  it('defaults engine to grok and voice to luna', () => {
    expect(getVocabTtsEnginePref()).toBe('grok')
    expect(getVocabTtsVoicePref()).toBe('luna')
  })

  it('persists engine and voice', () => {
    setVocabTtsEnginePref('system')
    expect(getVocabTtsEnginePref()).toBe('system')
    setVocabTtsVoicePref('eve')
    expect(getVocabTtsVoicePref()).toBe('eve')
  })

  it('rejects invalid voice', () => {
    setVocabTtsVoicePref('not-a-voice')
    expect(getVocabTtsVoicePref()).toBe('luna')
  })
})
