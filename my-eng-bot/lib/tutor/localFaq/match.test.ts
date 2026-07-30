import { describe, expect, it } from 'vitest'
import { matchLocalFaq } from '@/lib/tutor/localFaq/match'
import { looksLikeEnErrorUtterance, normalizeFaqText } from '@/lib/tutor/localFaq/normalizeFaq'
import { idleFaqSeed, pickIdleFaq } from '@/lib/tutor/localFaq/pickIdleFaq'
import { getLocalFaqById, localFaqPoolSize } from '@/lib/tutor/localFaq/catalog'

describe('localFaq normalize', () => {
  it('normalizes quotes and apostrophes', () => {
    expect(normalizeFaqText('Почему «I’m»?')).toContain("i'm")
  })

  it('detects EN error utterances', () => {
    expect(looksLikeEnErrorUtterance(normalizeFaqText('I has a car'))).toBe(true)
    expect(looksLikeEnErrorUtterance(normalizeFaqText('I havee got car'))).toBe(true)
    expect(looksLikeEnErrorUtterance(normalizeFaqText('Почему «I am busy», а не «I busy»?'))).toBe(
      false
    )
  })
})

describe('matchLocalFaq', () => {
  it('matches canonical to_be question', () => {
    const m = matchLocalFaq('Почему «I am busy», а не «I busy»?', 'a1')
    expect(m?.entry.id).toBe('a1.to_be.001')
    expect(m?.reason).toMatch(/exact|alias/)
  })

  it('matches paraphrase / alias', () => {
    const m = matchLocalFaq('чем отличаются a и an?', 'a1')
    expect(m?.entry.id).toBe('a1.articles.016')
  })

  it('matches by id', () => {
    const m = matchLocalFaq('a1.mistakes.131', 'a1')
    expect(m?.entry.id).toBe('a1.mistakes.131')
  })

  it('misses EN error sentences (no false FAQ hit)', () => {
    expect(matchLocalFaq('I has a car', 'a1')).toBeNull()
    expect(matchLocalFaq('I havee got car', 'a2')).toBeNull()
  })

  it('misses vague free-text (no Jaccard silent topic)', () => {
    expect(matchLocalFaq('Зачем I am.', 'a1')).toBeNull()
    expect(matchLocalFaq('Зачем и для чего I am.', 'a1')).toBeNull()
    expect(matchLocalFaq('почему про времена', 'a2')).toBeNull()
  })

  it('matches multi-token EN needle inside a question', () => {
    const m = matchLocalFaq('Почему I am used to wake up early ошибка?', 'b2')
    expect(m?.reason).toBe('needle')
    expect(m?.entry.id).toBe('b2.mistakes.099')
  })

  it('getLocalFaqById works', () => {
    expect(getLocalFaqById('a1.to_be.001')?.questionRu).toContain('I am busy')
    expect(localFaqPoolSize()).toBeGreaterThanOrEqual(400)
  })
})

describe('pickIdleFaq', () => {
  it('returns up to 3 unique topicKeys', () => {
    const a = pickIdleFaq('a1', 3, 42)
    expect(a.length).toBeGreaterThan(0)
    expect(a.length).toBeLessThanOrEqual(3)
    const topics = new Set(a.map((e) => e.topicKey))
    expect(topics.size).toBe(a.length)
    expect(a.every((e) => e.idleEligible)).toBe(true)
  })

  it('is stable for same seed', () => {
    expect(pickIdleFaq('a2', 3, 99).map((e) => e.id)).toEqual(
      pickIdleFaq('a2', 3, 99).map((e) => e.id)
    )
  })

  it('idleFaqSeed is stable per day/level', () => {
    const t = Date.UTC(2026, 6, 30)
    expect(idleFaqSeed('a1', t)).toBe(idleFaqSeed('a1', t))
    expect(idleFaqSeed('a1', t)).not.toBe(idleFaqSeed('a2', t))
  })
})
