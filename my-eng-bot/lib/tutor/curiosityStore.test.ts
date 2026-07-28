import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import {
  clearTutorCuriosityForTests,
  listTutorCuriosity,
  recordTutorCuriosity,
} from '@/lib/tutor/curiosityStore'

describe('curiosityStore', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearTutorCuriosityForTests()
  })

  it('records curiosity without treating it as error', () => {
    const entry = recordTutorCuriosity({
      topicTitle: 'Present Perfect',
      questionRu: 'Зачем он, если есть Past Simple?',
      canonicalKey: 'pp_vs_ps',
    })
    expect(entry?.topicTitle).toBe('Present Perfect')
    expect(listTutorCuriosity()).toHaveLength(1)
  })

  it('dedupes same canonicalKey + question', () => {
    recordTutorCuriosity({
      topicTitle: 'Present Perfect',
      questionRu: 'Зачем?',
      canonicalKey: 'pp',
    })
    recordTutorCuriosity({
      topicTitle: 'Present Perfect',
      questionRu: 'Зачем?',
      canonicalKey: 'pp',
    })
    expect(listTutorCuriosity()).toHaveLength(1)
  })
})
