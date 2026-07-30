import { describe, expect, it } from 'vitest'
import { AI_SAFETY_MARKERS } from '@/lib/ai/safetyPolicy'
import {
  buildTutorSchoolPhotoPrompt,
  normalizeTutorSchoolPhoto,
} from '@/lib/tutor/normalizeSchoolPhoto'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

describe('normalizeTutorSchoolPhoto', () => {
  it('accepts ok topics', () => {
    const r = normalizeTutorSchoolPhoto({
      status: 'ok',
      topics: ['Present Perfect', 'Past Simple'],
    })
    expect(r).toEqual({ kind: 'ok', topics: ['Present Perfect', 'Past Simple'] })
  })

  it('maps blur separately from not_en', () => {
    const blur = normalizeTutorSchoolPhoto({ status: 'rejected', reason: 'blur' })
    expect(blur.kind).toBe('rejected')
    if (blur.kind === 'rejected') {
      expect(blur.reason).toBe('blur')
      expect(blur.messageRu).toBe(TUTOR_CHAT_COPY.photoBlur)
    }
    const notEn = normalizeTutorSchoolPhoto({ status: 'rejected', reason: 'not_en' })
    if (notEn.kind === 'rejected') {
      expect(notEn.reason).toBe('not_en')
      expect(notEn.messageRu).toBe(TUTOR_CHAT_COPY.photoReject)
    }
  })
})

describe('buildTutorSchoolPhotoPrompt', () => {
  it('injects tutor safety block and status-bridge', () => {
    const prompt = buildTutorSchoolPhotoPrompt('a2', 'adult')
    expect(prompt).toContain(AI_SAFETY_MARKERS.antiExfil)
    expect(prompt).toContain(AI_SAFETY_MARKERS.adult18)
    expect(prompt).toContain(AI_SAFETY_MARKERS.harmBundle)
    expect(prompt).toMatch(/status-bridge|rejected/i)
    expect(prompt).toMatch(/English-learning question/i)
    expect(prompt).not.toContain(AI_SAFETY_MARKERS.childTeenHardening)
  })

  it('adds child-teen hardening for child audience', () => {
    const prompt = buildTutorSchoolPhotoPrompt('a2', 'child')
    expect(prompt).toContain(AI_SAFETY_MARKERS.childTeenHardening)
  })
})
