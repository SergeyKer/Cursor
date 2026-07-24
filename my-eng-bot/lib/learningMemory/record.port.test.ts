import { describe, expect, it, afterEach, vi } from 'vitest'
import {
  getLearningMemoryStoragePort,
  resetLearningMemoryStoragePort,
  setLearningMemoryStoragePort,
  type LearningMemoryStoragePort,
} from '@/lib/learningMemory/port'
import { recordPracticeWrongSignal } from '@/lib/learningMemory/record'
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
})
