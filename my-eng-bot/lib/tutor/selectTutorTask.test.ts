import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import { clearTutorCuriosityForTests, recordTutorCuriosity } from '@/lib/tutor/curiosityStore'
import { listTutorQuestionJobs, selectTutorTask } from '@/lib/tutor/selectTutorTask'
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

  it('FAQ-first: present-simple without AI cache still shows card when pool enabled', () => {
    const task = selectTutorTask({
      attentionZones: [zone({ skillTagId: 'present-simple', title: 'Present Simple', errorCount: 2 })],
      level: 'a1',
      faqPoolEnabled: true,
    })
    expect(task?.action.kind).toBe('open_tutor')
    if (task?.action.kind === 'open_tutor') {
      expect(task.action.source).toBe('error_prompt')
      expect(task.action.prefill.length).toBeGreaterThan(8)
      expect(task.action.skillTagId).toBe('present-simple')
    }
  })

  it('FAQ-first prefers canon over AI cache for mapped zone', () => {
    const fp = tutorQuestionFingerprint('present-simple', '2')
    setCachedTutorQuestion(fp, 'AI generated question about Present Simple')
    const task = selectTutorTask({
      attentionZones: [zone({ skillTagId: 'present-simple', title: 'Present Simple', errorCount: 2 })],
      level: 'a1',
      faqPoolEnabled: true,
    })
    expect(task?.action.kind).toBe('open_tutor')
    if (task?.action.kind === 'open_tutor') {
      expect(task.action.prefill).not.toBe('AI generated question about Present Simple')
    }
  })

  it('flag OFF keeps cache→curiosity path (no FAQ-first)', () => {
    const task = selectTutorTask({
      attentionZones: [zone({ skillTagId: 'present-simple', title: 'Present Simple', errorCount: 2 })],
      level: 'a1',
      faqPoolEnabled: false,
    })
    expect(task).toBeNull()
  })

  it('spoken-fluency without cache yields null (no phantom FAQ)', () => {
    expect(
      selectTutorTask({
        attentionZones: [zone({ skillTagId: 'spoken-fluency', title: 'Живая речь' })],
        level: 'a2',
        faqPoolEnabled: true,
      })
    ).toBeNull()
  })
})

describe('listTutorQuestionJobs', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearTutorQuestionStateForTests()
  })

  it('skips FAQ-canon zone0 and returns job for zone1 cache miss', () => {
    const zones = [
      zone({ skillTagId: 'present-simple', title: 'Present Simple', score: 50, errorCount: 4 }),
      zone({ skillTagId: 'tense.pp', title: 'Present Perfect', score: 40, errorCount: 3 }),
    ]
    const jobs = listTutorQuestionJobs(zones, { level: 'a1', faqPoolEnabled: true })
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.skillTagId).toBe('tense.pp')
  })

  it('without faq pool still jobs first cache-miss zone', () => {
    const zones = [
      zone({ skillTagId: 'present-simple', title: 'Present Simple', errorCount: 4 }),
      zone({ skillTagId: 'tense.pp', title: 'PP', errorCount: 3 }),
    ]
    const jobs = listTutorQuestionJobs(zones, { level: 'a1', faqPoolEnabled: false })
    expect(jobs[0]?.skillTagId).toBe('present-simple')
  })
})
