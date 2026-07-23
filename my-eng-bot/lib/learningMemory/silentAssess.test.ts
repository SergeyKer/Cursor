import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  abortSilentAssessInFlight,
  requestSilentLanguageNote,
  scheduleSilentAssess,
  SILENT_ASSESS_TIMEOUT_MS,
} from '@/lib/learningMemory/silentAssess'
import { clearLearningSignals, saveLearningSignal } from '@/lib/learningMemory/storage'
import { hashUtterance } from '@/lib/learningMemory/hash'

function memoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
  }
}

describe('silentAssess', () => {
  afterEach(() => {
    abortSilentAssessInFlight()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    clearLearningSignals()
  })

  it('skips stop tokens without fetch', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await requestSilentLanguageNote({
      text: 'ok',
      provider: 'openai',
      audience: 'adult',
      mode: 'communication',
      source: 'chat',
    })
    expect(result).toEqual({ ok: false, skipped: true, reason: 'ineligible' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips known utterance hash', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const text = 'I go yesterday'
    saveLearningSignal({
      source: 'chat',
      detector: 'language_note',
      utteranceHash: hashUtterance(text),
      rawTopicIds: ['past'],
      rawTopicTitles: ['Past'],
      lessonIdHint: null,
      skillTagIds: ['past'],
    })
    const result = await requestSilentLanguageNote({
      text,
      provider: 'openai',
      audience: 'adult',
      mode: 'communication',
      source: 'chat',
    })
    expect(result).toEqual({ ok: false, skipped: true, reason: 'hash_known' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses short timeout constant (no Note retry storm)', () => {
    expect(SILENT_ASSESS_TIMEOUT_MS).toBeLessThanOrEqual(12_000)
    expect(SILENT_ASSESS_TIMEOUT_MS).toBeGreaterThanOrEqual(8_000)
  })

  it('one attempt: fetch once then records needs_fix only via caller', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        note: {
          status: 'needs_better',
          original: 'I go home',
          correct: 'I went home',
          reviewTopics: [],
          lessonId: null,
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await requestSilentLanguageNote({
      text: 'I go home yesterday with friends',
      provider: 'openai',
      audience: 'adult',
      mode: 'communication',
      source: 'chat',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
  })

  it('scheduleSilentAssess onNote fires for needs_fix only', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const onNote = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        note: {
          status: 'needs_fix',
          original: 'I go yesterday',
          correct: 'I went yesterday',
          correctHighlights: [],
          correctReasons: ['Past'],
          better: null,
          betterHighlights: [],
          betterReasons: [],
          betterAlternatives: [],
          reviewTopics: [],
          lessonId: null,
          lessonTitle: null,
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    scheduleSilentAssess({
      text: 'I go yesterday to the park',
      provider: 'openai',
      audience: 'adult',
      mode: 'engvo',
      source: 'call',
      onNote,
    })
    await vi.waitFor(() => expect(onNote).toHaveBeenCalledTimes(1))
    expect(onNote.mock.calls[0]?.[0]?.status).toBe('needs_fix')
  })

  it('scheduleSilentAssess onNote skips needs_better', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const onNote = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        note: {
          status: 'needs_better',
          original: 'I go home',
          correct: 'I went home',
          correctHighlights: [],
          correctReasons: [],
          better: 'I headed home',
          betterHighlights: [],
          betterReasons: [],
          betterAlternatives: [],
          reviewTopics: [],
          lessonId: null,
          lessonTitle: null,
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    scheduleSilentAssess({
      text: 'I go home yesterday with friends',
      provider: 'openai',
      audience: 'adult',
      mode: 'engvo',
      source: 'call',
      onNote,
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(onNote).not.toHaveBeenCalled()
  })
})
