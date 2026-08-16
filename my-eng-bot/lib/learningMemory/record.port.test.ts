import { describe, expect, it, afterEach, vi } from 'vitest'
import {
  getLearningMemoryStoragePort,
  resetLearningMemoryStoragePort,
  setLearningMemoryStoragePort,
  type LearningMemoryStoragePort,
} from '@/lib/learningMemory/port'
import { recordPracticeWrongSignal, recordSilentAssessSignal } from '@/lib/learningMemory/record'
import type { LanguageNote } from '@/lib/languageNote/types'
import type { LearningSignal, SkillMasterySlice } from '@/lib/learningMemory/types'

describe('learningMemory record uses storage port', () => {
  afterEach(() => {
    resetLearningMemoryStoragePort()
    vi.unstubAllGlobals()
  })

  it('intercepts saveSignal from recordPracticeWrongSignal', async () => {
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => {
        cb()
        return 1
      },
    })
    const saved: LearningSignal[] = []
    const fake: LearningMemoryStoragePort = {
      listSignals: () => saved,
      saveSignal: (input) => {
        const signal: LearningSignal = {
          id: 'test',
          at: new Date().toISOString(),
          source: input.source,
          detector: input.detector,
          utteranceHash: input.utteranceHash,
          rawTopicIds: input.rawTopicIds,
          rawTopicTitles: input.rawTopicTitles,
          lessonIdHint: input.lessonIdHint,
          skillTagIds: input.skillTagIds,
          snippet: input.snippet,
        }
        saved.push(signal)
        return signal
      },
      clearSignals: () => {
        saved.length = 0
      },
      loadMasteryMap: () => ({} as Record<string, SkillMasterySlice>),
      saveMasteryMap: () => undefined,
      clearMasteryMap: () => undefined,
      markSkillsResolved: () => undefined,
      clearSkillResolved: () => undefined,
    }
    setLearningMemoryStoragePort(fake)
    recordPracticeWrongSignal({
      lessonId: 'who-likes',
      userAnswer: 'wrong',
      targetAnswer: 'right',
      tagIds: ['likes'],
    })
    expect(getLearningMemoryStoragePort().listSignals()).toHaveLength(1)
    expect(saved[0]?.source).toBe('practice')
  })

  it('stores first correctReason as snippet.why for silent assess', () => {
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => {
        cb()
        return 1
      },
    })
    const saved: LearningSignal[] = []
    const fake: LearningMemoryStoragePort = {
      listSignals: () => saved,
      saveSignal: (input) => {
        const signal: LearningSignal = {
          id: 'test',
          at: new Date().toISOString(),
          source: input.source,
          detector: input.detector,
          utteranceHash: input.utteranceHash,
          rawTopicIds: input.rawTopicIds,
          rawTopicTitles: input.rawTopicTitles,
          lessonIdHint: input.lessonIdHint,
          skillTagIds: input.skillTagIds,
          snippet: input.snippet,
        }
        saved.push(signal)
        return signal
      },
      clearSignals: () => {
        saved.length = 0
      },
      loadMasteryMap: () => ({} as Record<string, SkillMasterySlice>),
      saveMasteryMap: () => undefined,
      clearMasteryMap: () => undefined,
      markSkillsResolved: () => undefined,
      clearSkillResolved: () => undefined,
    }
    setLearningMemoryStoragePort(fake)
    const note: LanguageNote = {
      status: 'needs_fix',
      original: 'I is happy',
      correct: 'I am happy',
      correctHighlights: [],
      correctReasons: ['После I нужна форма am.'],
      better: null,
      betterHighlights: [],
      betterReasons: [],
      betterAlternatives: [],
      reviewTopics: [{ id: 'to-be', title: 'to be' }],
      lessonId: null,
      lessonTitle: null,
    }
    recordSilentAssessSignal({ note, source: 'chat' })
    expect(saved[0]?.snippet?.why).toBe('После I нужна форма am.')
    expect(saved[0]?.detector).toBe('silent_assess')
  })
})
