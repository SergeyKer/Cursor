import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAttentionZones,
  hashUtterance,
  mapLearningSource,
  resolveRecommendation,
  scoreSkill,
  shouldSaveLanguageNoteSignal,
} from '@/lib/learningMemory'
import {
  clearLearningSignals,
  clearSkillMasteryMap,
  listLearningSignals,
  loadSkillMasteryMap,
  markSkillsResolved,
  saveLearningSignal,
} from '@/lib/learningMemory/storage'
import { RESOLVE_COOLDOWN_MS } from '@/lib/learningMemory/types'

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

describe('learningMemory', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearLearningSignals()
    clearSkillMasteryMap()
  })

  it('maps modes to sources', () => {
    expect(mapLearningSource({ mode: 'communication' })).toBe('chat')
    expect(mapLearningSource({ mode: 'communication', engvoVoiceMode: true })).toBe('call')
    expect(mapLearningSource({ mode: 'translation' })).toBe('translation')
    expect(mapLearningSource({ mode: 'dialogue' })).toBe('guided_dialogue')
  })

  it('labels teacher source in attention zones', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    vi.stubGlobal('localStorage', (window as unknown as { localStorage: Storage }).localStorage)
    saveLearningSignal({
      source: 'teacher',
      detector: 'teacher_correction',
      utteranceHash: hashUtterance('i go yesterday'),
      rawTopicIds: ['teacher-errors'],
      rawTopicTitles: ['Преподаватель'],
      lessonIdHint: null,
      skillTagIds: ['teacher-errors'],
      snippet: { original: 'i go yesterday', corrected: 'I went yesterday' },
    })
    const signals = listLearningSignals()
    expect(signals).toHaveLength(1)
    expect(signals[0]?.source).toBe('teacher')
    const zones = getAttentionZones(signals, loadSkillMasteryMap())
    expect(zones.length).toBeGreaterThan(0)
    expect(zones[0]?.sourceHint).toBe('В преподавателе')
  })

  it('filters language note statuses', () => {
    expect(shouldSaveLanguageNoteSignal('needs_fix', 'I go to school yesterday')).toBe(true)
    expect(shouldSaveLanguageNoteSignal('needs_better', 'I go to school yesterday')).toBe(false)
    expect(shouldSaveLanguageNoteSignal('already_good', 'I go to school yesterday')).toBe(false)
    expect(shouldSaveLanguageNoteSignal('needs_fix', 'ok')).toBe(false)
    expect(shouldSaveLanguageNoteSignal('needs_fix', 'hi')).toBe(false)
  })

  it('saves signals with limit and hash dedupe', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const hash = hashUtterance('I has a cat')
    saveLearningSignal({
      source: 'chat',
      detector: 'silent_assess',
      utteranceHash: hash,
      rawTopicIds: ['present-simple'],
      rawTopicTitles: ['Present Simple'],
      lessonIdHint: null,
      skillTagIds: ['present-simple'],
      snippet: { original: 'I has a cat', corrected: 'I have a cat' },
    })
    saveLearningSignal({
      source: 'chat',
      detector: 'language_note',
      utteranceHash: hash,
      rawTopicIds: ['present-simple'],
      rawTopicTitles: ['Present Simple'],
      lessonIdHint: '4',
      skillTagIds: ['present-simple'],
    })
    expect(listLearningSignals()).toHaveLength(1)
    expect(listLearningSignals()[0]?.lessonIdHint).toBe('4')
  })

  it('scores cooldown as hidden', () => {
    const now = Date.now()
    const score = scoreSkill(
      {
        skillTagId: 'present-simple',
        errorCount: 10,
        bySource: { chat: 10 },
        lastAt: new Date(now).toISOString(),
        resolvedUntil: new Date(now + RESOLVE_COOLDOWN_MS).toISOString(),
      },
      now
    )
    expect(score).toBe(-1)
  })

  it('builds attention zones and resolves lesson chips', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const now = Date.now()
    saveLearningSignal({
      at: new Date(now).toISOString(),
      source: 'practice',
      detector: 'practice',
      rawTopicIds: [],
      rawTopicTitles: [],
      lessonIdHint: '2',
      skillTagIds: ['subject-questions'],
    })
    saveLearningSignal({
      at: new Date(now).toISOString(),
      source: 'chat',
      detector: 'silent_assess',
      rawTopicIds: ['weird-ai-topic'],
      rawTopicTitles: ['Weird AI Topic'],
      lessonIdHint: null,
      skillTagIds: ['weird-ai-topic'],
    })
    const zones = getAttentionZones(listLearningSignals(), loadSkillMasteryMap(), now)
    expect(zones.length).toBeGreaterThan(0)
    const who = zones.find((z) => z.skillTagId === 'subject-questions')
    expect(who?.chipActive).toBe(true)
    expect(who?.lessonId).toBe('2')
    const weird = zones.find((z) => z.skillTagId === 'weird-ai-topic')
    expect(weird?.chipActive).toBe(false)

    expect(resolveRecommendation({ skillTagId: 'subject-questions' }).chipActive).toBe(true)
    expect(resolveRecommendation({ skillTagId: 'no-such-skill' }).chipActive).toBe(false)
  })

  it('markSkillsResolved persists cooldown', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    const now = Date.now()
    markSkillsResolved(['present-simple'], RESOLVE_COOLDOWN_MS, now)
    const map = loadSkillMasteryMap()
    expect(map['present-simple']?.resolvedUntil).toBeTruthy()
    const zones = getAttentionZones(
      [
        {
          id: '1',
          at: new Date(now).toISOString(),
          source: 'chat',
          detector: 'silent_assess',
          rawTopicIds: [],
          rawTopicTitles: [],
          lessonIdHint: null,
          skillTagIds: ['present-simple'],
        },
      ],
      map,
      now
    )
    expect(zones.find((z) => z.skillTagId === 'present-simple')).toBeUndefined()
  })
})
