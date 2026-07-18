import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  getLearningMemoryStoragePort,
  resetLearningMemoryStoragePort,
  setLearningMemoryStoragePort,
  type LearningMemoryStoragePort,
} from '@/lib/learningMemory/port'
import type { LearningSignal, SkillMasterySlice } from '@/lib/learningMemory/types'

describe('learningMemory storage port', () => {
  afterEach(() => {
    resetLearningMemoryStoragePort()
  })

  it('defaults to local adapter API shape', () => {
    const port = getLearningMemoryStoragePort()
    expect(typeof port.listSignals).toBe('function')
    expect(typeof port.loadMasteryMap).toBe('function')
    expect(typeof port.saveSignal).toBe('function')
  })

  it('allows swapping adapter for tests', () => {
    const signals: LearningSignal[] = []
    const fake: LearningMemoryStoragePort = {
      listSignals: () => signals,
      saveSignal: () => null,
      clearSignals: () => {
        signals.length = 0
      },
      loadMasteryMap: () => ({} as Record<string, SkillMasterySlice>),
      saveMasteryMap: () => undefined,
      clearMasteryMap: () => undefined,
      markSkillsResolved: () => undefined,
      clearSkillResolved: () => undefined,
    }
    setLearningMemoryStoragePort(fake)
    expect(getLearningMemoryStoragePort().listSignals()).toBe(signals)
  })
})
