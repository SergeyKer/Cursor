import { describe, expect, it } from 'vitest'
import {
  canOpenLocalReferenceLesson,
  resolveLocalReferenceLesson,
} from '@/lib/reference/canOpenLocalReference'

describe('canOpenLocalReferenceLesson', () => {
  it('opens structured lessons 1–4', () => {
    for (const id of ['1', '2', '3', '4']) {
      expect(canOpenLocalReferenceLesson(id)).toBe(true)
      expect(resolveLocalReferenceLesson(id)?.relatedLessonId).toBe(id)
    }
  })

  it('rejects unknown / empty ids', () => {
    expect(canOpenLocalReferenceLesson('')).toBe(false)
    expect(canOpenLocalReferenceLesson('999')).toBe(false)
    expect(canOpenLocalReferenceLesson('not-a-lesson')).toBe(false)
  })
})
