import { describe, expect, it } from 'vitest'
import {
  clearReferenceSyllabusCacheForTests,
  getReferenceSyllabusTopics,
  getSyllabusTopicByKey,
  listOpenableSyllabusTopics,
  listSyllabusTopicsByLevel,
  SYLLABUS_NOISE_TOPIC_KEYS,
} from '@/lib/reference/syllabus'
import {
  findSyllabusTopicCandidates,
  findOpenableSyllabusLessonHits,
} from '@/lib/reference/syllabus/search'
import { getPrebuiltSheet, hasStaticPrebuiltSheet } from '@/lib/reference/prebuiltStore'
import { resolveOpenReferenceSheet } from '@/lib/reference/openReferenceSheet'

describe('reference syllabus seed', () => {
  it('builds FAQ∪gaps without noise buckets', () => {
    clearReferenceSyllabusCacheForTests()
    const topics = getReferenceSyllabusTopics()
    expect(topics.length).toBeGreaterThanOrEqual(55)
    expect(topics.length).toBeLessThanOrEqual(120)
    for (const noise of SYLLABUS_NOISE_TOPIC_KEYS) {
      expect(topics.some((t) => t.topicKey === noise)).toBe(false)
    }
  })

  it('marks lessons 1–4 as lesson_ready', () => {
    clearReferenceSyllabusCacheForTests()
    const openable = listOpenableSyllabusTopics()
    const lessonIds = new Set(openable.map((t) => t.lessonId).filter(Boolean))
    expect(lessonIds.has('1')).toBe(true)
    expect(lessonIds.has('2')).toBe(true)
    expect(lessonIds.has('3')).toBe(true)
    expect(lessonIds.has('4')).toBe(true)
    expect(getSyllabusTopicByKey('its_time_to')?.status).toBe('lesson_ready')
    expect(getSyllabusTopicByKey('to_be')?.status).toBe('lesson_ready')
  })

  it('lists topics by CEFR level with human titles', () => {
    clearReferenceSyllabusCacheForTests()
    const a1 = listSyllabusTopicsByLevel('A1')
    expect(a1.length).toBeGreaterThan(5)
    expect(a1.every((t) => t.level === 'A1')).toBe(true)
    expect(a1.every((t) => t.titleRu.trim().length > 0)).toBe(true)
  })

  it('searches it’s time to openable lesson 1', () => {
    clearReferenceSyllabusCacheForTests()
    const openable = findOpenableSyllabusLessonHits("it's time", 5)
    expect(openable.some((h) => h.lessonId === '1')).toBe(true)
  })

  it('opens have_got from the offline prebuilt registry', () => {
    clearReferenceSyllabusCacheForTests()
    const haveHits = findSyllabusTopicCandidates('have', 8)
    expect(haveHits.some((h) => h.topic.topicKey === 'have_got')).toBe(true)
    expect(hasStaticPrebuiltSheet('have_got')).toBe(true)
    const opened = resolveOpenReferenceSheet({ topicKey: 'have_got' })
    expect(opened.kind).toBe('prebuilt')
    if (opened.kind === 'prebuilt') {
      expect(opened.sheet.id).toContain('prebuilt:v1:have_got')
      expect(opened.sheet.relatedLessonId).toBeNull()
    }
  })

  it('lesson_ready wins over a prebuilt sheet for the same topic', () => {
    clearReferenceSyllabusCacheForTests()
    expect(getPrebuiltSheet('to_be')?.id).toContain('prebuilt:v1:to_be')
    const opened = resolveOpenReferenceSheet({ topicKey: 'to_be' })
    expect(opened.kind).toBe('lesson')
    if (opened.kind === 'lesson') {
      expect(opened.lessonId).toBe('4')
      expect(opened.sheet.relatedLessonId).toBe('4')
    }
  })

  it('openable count includes the prebuilt core', () => {
    clearReferenceSyllabusCacheForTests()
    expect(listOpenableSyllabusTopics().length).toBeGreaterThan(4)
  })
})
