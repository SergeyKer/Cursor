import { describe, expect, it } from 'vitest'
import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'
import {
  getLocalExplainPackByFaqId,
  listGoldenPathExplainPacks,
  lookupLocalExplainPack,
} from '@/lib/tutor/localExplain/lookup'

describe('localExplain golden path packs', () => {
  it('covers lessons 1–4 with valid lessonIdHint sheets', () => {
    const packs = listGoldenPathExplainPacks()
    expect(packs.length).toBeGreaterThanOrEqual(4)
    const hints = new Set(
      packs.map((p) => p.answer.topicAnchor.lessonIdHint).filter(Boolean)
    )
    expect(hints.has('1')).toBe(true)
    expect(hints.has('2')).toBe(true)
    expect(hints.has('3')).toBe(true)
    expect(hints.has('4')).toBe(true)
    for (const pack of packs) {
      const hint = pack.answer.topicAnchor.lessonIdHint
      expect(hint).toBeTruthy()
      expect(buildReferenceSheetByLessonId(hint!)).not.toBeNull()
      expect(pack.answer.cheatsheetVisibility).toBe('primary')
    }
  })

  it('resolves by faqId without network', () => {
    const a = lookupLocalExplainPack('a1.to_be.003', 'adult')
    expect(a?.topicAnchor.lessonIdHint).toBe('4')
    expect(a?.paragraphs.length).toBeGreaterThanOrEqual(2)
  })

  it('resolves by question text', () => {
    const a = lookupLocalExplainPack('Почему «I am a student», а не «I is a student»?', 'adult')
    expect(a?.topicAnchor.lessonIdHint).toBe('4')
  })

  it('resolves It’s time FAQ question to lesson 1', () => {
    const a = lookupLocalExplainPack(
      'Почему «It’s time to go» / «It’s time we went»?',
      'adult'
    )
    expect(a?.topicAnchor.lessonIdHint).toBe('1')
  })

  it('returns null for unknown free-text (API path)', () => {
    expect(lookupLocalExplainPack('Explain quantum physics in English', 'adult')).toBeNull()
  })

  it('pairs lessonIdHint with openable local sheet', () => {
    for (const pack of listGoldenPathExplainPacks()) {
      const hint = pack.answer.topicAnchor.lessonIdHint!
      const sheet = buildReferenceSheetByLessonId(hint)
      expect(sheet?.relatedLessonId).toBe(hint)
      expect(sheet?.id).toBe(hint)
    }
  })
})
