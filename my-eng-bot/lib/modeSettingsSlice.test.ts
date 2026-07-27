import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  applyModeSlice,
  applySettingsWithModeSlice,
  createSeededModeSettingsStore,
  extractModeSlice,
  MODE_SETTINGS_STORAGE_KEY,
  persistActiveModeSlice,
} from './modeSettingsSlice'
import type { Settings } from './types'

const base = (patch: Partial<Settings> = {}): Settings => ({
  provider: 'openai',
  openAiChatPreset: 'gpt-4o-mini',
  mode: 'dialogue',
  sentenceType: 'mixed',
  topic: 'free_talk',
  level: 'a1',
  tenses: ['present_simple'],
  audience: 'adult',
  voiceId: '',
  communicationInputExpectedLang: 'en',
  communicationVoiceInputMode: 'en',
  translationDrillKind: 'tense_drill',
  translationLessonId: 'all',
  ...patch,
})

function stubLocalStorage() {
  const map = new Map<string, string>()
  const localStorageMock = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => {
      map.clear()
    },
  }
  vi.stubGlobal('window', { localStorage: localStorageMock })
  vi.stubGlobal('localStorage', localStorageMock)
}

describe('modeSettingsSlice', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  it('extract/apply round-trip', () => {
    const s = base({ tenses: ['all'], level: 'a2', topic: 'food', sentenceType: 'negative' })
    const slice = extractModeSlice(s)
    expect(slice.tenses).toEqual(['all'])
    expect(applyModeSlice(base(), slice).tenses).toEqual(['all'])
    expect(applyModeSlice(base(), slice).topic).toBe('food')
  })

  it('seeds both modes from current settings once', () => {
    const store = createSeededModeSettingsStore(base({ tenses: ['past_simple'], level: 'b1' }))
    expect(store.migrationDone).toBe(true)
    expect(store.dialogue.tenses).toEqual(['past_simple'])
    expect(store.translation.tenses).toEqual(['past_simple'])
    expect(store.dialogue.level).toBe('b1')
  })

  it('switching dialogue→translation restores translation slice, not forced all', () => {
    const dialogue = base({ mode: 'dialogue', tenses: ['present_simple'], level: 'a1', topic: 'hobbies' })
    persistActiveModeSlice(dialogue)

    const translationPref = base({
      mode: 'translation',
      tenses: ['past_simple'],
      level: 'a2',
      topic: 'travel',
      sentenceType: 'interrogative',
    })
    persistActiveModeSlice(translationPref)

    const dialogueAll = base({ mode: 'dialogue', tenses: ['all'], level: 'a1', topic: 'hobbies' })
    persistActiveModeSlice(dialogueAll)

    const switched = applySettingsWithModeSlice(dialogueAll, {
      ...dialogueAll,
      mode: 'translation',
    })
    expect(switched.mode).toBe('translation')
    expect(switched.tenses).toEqual(['past_simple'])
    expect(switched.level).toBe('a2')
    expect(switched.topic).toBe('travel')
    expect(switched.sentenceType).toBe('interrogative')
  })

  it('switching back restores dialogue all', () => {
    const dialogueAll = base({ mode: 'dialogue', tenses: ['all'], level: 'a1', topic: 'food' })
    persistActiveModeSlice(dialogueAll)
    const translation = base({ mode: 'translation', tenses: ['future_simple'], level: 'b1' })
    persistActiveModeSlice(translation)

    const back = applySettingsWithModeSlice(translation, { ...translation, mode: 'dialogue' })
    expect(back.tenses).toEqual(['all'])
    expect(back.topic).toBe('food')
    expect(back.level).toBe('a1')
  })

  it('writes storage key', () => {
    persistActiveModeSlice(base({ tenses: ['all'] }))
    expect(localStorage.getItem(MODE_SETTINGS_STORAGE_KEY)).toBeTruthy()
  })
})
