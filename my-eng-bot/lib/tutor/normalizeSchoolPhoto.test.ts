import { describe, expect, it } from 'vitest'
import { normalizeTutorSchoolPhoto } from '@/lib/tutor/normalizeSchoolPhoto'
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
