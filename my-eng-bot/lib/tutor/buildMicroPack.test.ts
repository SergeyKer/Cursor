import { describe, expect, it, vi, afterEach } from 'vitest'
import { buildTutorMicroPackFromExplain } from '@/lib/tutor/buildMicroPack'
import { normalizeTutorExplain } from '@/lib/tutor/normalizeExplain'
import {
  resetLearningMemoryStoragePort,
  setLearningMemoryStoragePort,
} from '@/lib/learningMemory/port'
import { recordTutorMicroWrongSignal } from '@/lib/learningMemory/record'
import type { LearningSignal } from '@/lib/learningMemory/types'

describe('buildTutorMicroPackFromExplain', () => {
  it('builds pack from contrast explain', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'contrast',
        title: 'PP vs PS',
        paragraphs: ['a', 'b'],
        examplesEn: ['I have lost my keys.', 'I lost my keys yesterday.'],
        contrastPair: ['Present Perfect', 'Past Simple'],
        rememberRu: 'Результат сейчас → Perfect.',
        topicAnchor: { title: 'PP vs PS', canonicalKey: 'pp_vs_ps', skillTagIds: ['tense.pp'] },
      },
      { audience: 'child' }
    )
    expect(answer).not.toBeNull()
    const pack = buildTutorMicroPackFromExplain(answer!)
    expect(pack?.items.length).toBeGreaterThanOrEqual(2)
    expect(pack?.summaryRu.length).toBeGreaterThan(0)
  })
})

describe('recordTutorMicroWrongSignal', () => {
  afterEach(() => {
    resetLearningMemoryStoragePort()
    vi.unstubAllGlobals()
  })

  it('raises errorCount in AttentionZones (mixed pipeline)', () => {
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => {
        cb()
        return 1
      },
    })
    const saved: LearningSignal[] = []
    setLearningMemoryStoragePort({
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
      loadMasteryMap: () => ({}),
      saveMasteryMap: () => undefined,
      clearMasteryMap: () => undefined,
      markSkillsResolved: () => undefined,
      clearSkillResolved: () => undefined,
    })

    recordTutorMicroWrongSignal({
      skillTagId: 'tense.pp',
      topicTitle: 'Present Perfect',
      userAnswer: 'I lost my keys',
      correctAnswer: 'I have lost my keys',
      canonicalKey: 'pp_vs_ps',
    })

    expect(saved.some((s) => s.source === 'tutor' && s.detector === 'tutor_micro')).toBe(true)
    expect(saved[0]?.skillTagIds).toContain('tense.pp')
  })
})
