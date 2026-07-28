import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import { clearTutorCuriosityForTests, recordTutorCuriosity } from '@/lib/tutor/curiosityStore'
import { selectTutorTask } from '@/lib/tutor/selectTutorTask'
import {
  clearTutorQuestionStateForTests,
  setCachedTutorQuestion,
  tutorQuestionFingerprint,
} from '@/lib/tutor/tutorQuestionCache'
import type { AttentionZone } from '@/lib/learningMemory/types'

const zone = (partial: Partial<AttentionZone> & Pick<AttentionZone, 'skillTagId' | 'title'>): AttentionZone => ({
  errorCount: 3,
  sourceHint: 'В практике',
  lessonId: null,
  chipActive: true,
  suggestionLine: '',
  score: 40,
  ...partial,
})

describe('selectTutorTask', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearTutorQuestionStateForTests()
    clearTutorCuriosityForTests()
  })

  it('uses cached AI question for top zone without re-ranking', () => {
    const zones = [
      zone({ skillTagId: 'tense.pp', title: 'Present Perfect', score: 50, errorCount: 5 }),
      zone({ skillTagId: 'articles', title: 'Articles', score: 20, errorCount: 2 }),
    ]
    const fp = tutorQuestionFingerprint('tense.pp', '5')
    setCachedTutorQuestion(fp, 'Зачем Present Perfect, если есть Past Simple?')
    const task = selectTutorTask({ attentionZones: zones })
    expect(task?.action.kind).toBe('open_tutor')
    if (task?.action.kind === 'open_tutor') {
      expect(task.action.skillTagId).toBe('tense.pp')
      expect(task.action.prefill).toContain('Present Perfect')
      expect(task.action.source).toBe('error_prompt')
    }
  })

  it('falls back to curiosity when no cached zone question', () => {
    recordTutorCuriosity({
      topicTitle: 'Articles',
      questionRu: 'Когда ставить the?',
      canonicalKey: 'articles',
    })
    const task = selectTutorTask({ attentionZones: [] })
    expect(task?.action.kind).toBe('open_tutor')
    if (task?.action.kind === 'open_tutor') {
      expect(task.action.source).toBe('curiosity')
      expect(task.action.prefill).toBe('Когда ставить the?')
    }
  })

  it('hides card when no cache and no curiosity', () => {
    expect(selectTutorTask({ attentionZones: [zone({ skillTagId: 'x', title: 'X' })] })).toBeNull()
  })
})
