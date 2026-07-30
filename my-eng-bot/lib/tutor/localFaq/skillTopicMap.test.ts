import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import {
  clearHalfOldestShown,
  clearKnownFaqTopicKeysCacheForTests,
  clearShownFaqForTests,
  listShownFaqIds,
  pickCanonicalFaqForTopic,
  pickIdleFaq,
  recordShownFaqIds,
  resolveFaqCanonForZone,
  skillTagIdToTopicKey,
  topicKeysFromSkillTagIds,
} from '@/lib/tutor/localFaq'

describe('skillTopicMap', () => {
  beforeEach(() => {
    clearKnownFaqTopicKeysCacheForTests()
  })

  it('maps theory tags via normalize and aliases', () => {
    expect(skillTagIdToTopicKey('present-simple')).toBe('present_simple')
    expect(skillTagIdToTopicKey('reported-speech')).toBe('reported_speech')
    expect(skillTagIdToTopicKey('word-order')).toBe('word_order')
    expect(skillTagIdToTopicKey('special-questions')).toBe('вопросы_и_порядок_слов')
    expect(skillTagIdToTopicKey('subject-questions')).toBe('вопросы_и_порядок_слов')
  })

  it('returns null for explicit no-map and phantoms', () => {
    expect(skillTagIdToTopicKey('formal-it')).toBeNull()
    expect(skillTagIdToTopicKey('spoken-fluency')).toBeNull()
    expect(skillTagIdToTopicKey('tense.pp')).toBeNull()
    expect(skillTagIdToTopicKey('like-ing')).toBeNull()
  })

  it('accepts already-snake topic keys that exist', () => {
    expect(skillTagIdToTopicKey('articles')).toBe('articles')
  })

  it('topicKeysFromSkillTagIds dedupes', () => {
    expect(topicKeysFromSkillTagIds(['present-simple', 'present_simple', 'spoken-fluency'])).toEqual([
      'present_simple',
    ])
  })
})

describe('pickCanonicalFaqForTopic / resolveFaqCanonForZone', () => {
  it('picks grammar|contrast over phrase and highest popularity', () => {
    const entry = pickCanonicalFaqForTopic({ topicKey: 'present_simple', level: 'a1' })
    expect(entry).not.toBeNull()
    expect(entry!.topicKey).toBe('present_simple')
    expect(entry!.genre === 'grammar' || entry!.genre === 'contrast').toBe(true)
  })

  it('resolves zone via skill map', () => {
    const entry = resolveFaqCanonForZone({ skillTagId: 'present-simple' }, 'a2')
    expect(entry?.topicKey).toBe('present_simple')
  })

  it('returns null for unmapped zone', () => {
    expect(resolveFaqCanonForZone({ skillTagId: 'spoken-fluency' }, 'a2')).toBeNull()
  })
})

describe('shownFaqStore', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearShownFaqForTests()
  })

  it('records and lists shown ids; upsert is idempotent', () => {
    recordShownFaqIds(['a1.to_be.001', 'a1.to_be.002'])
    recordShownFaqIds(['a1.to_be.001'])
    expect(listShownFaqIds().sort()).toEqual(['a1.to_be.001', 'a1.to_be.002'].sort())
  })

  it('ignores bank_ ids', () => {
    recordShownFaqIds(['bank_0_foo'])
    expect(listShownFaqIds()).toEqual([])
  })

  it('clearHalfOldestShown drops oldest half', () => {
    const now = Date.now()
    recordShownFaqIds(['id_a'], now - 4000)
    recordShownFaqIds(['id_b'], now - 3000)
    recordShownFaqIds(['id_c'], now - 2000)
    recordShownFaqIds(['id_d'], now - 1000)
    const dropped = clearHalfOldestShown(now)
    expect(dropped).toBe(2)
    const left = listShownFaqIds(now)
    expect(left).toHaveLength(2)
    expect(left).toContain('id_c')
    expect(left).toContain('id_d')
  })
})

describe('pickIdleFaq opts', () => {
  it('keeps positional API stable without opts', () => {
    const a = pickIdleFaq('a1', 3, 42)
    const b = pickIdleFaq('a1', 3, 42)
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id))
    expect(a).toHaveLength(3)
  })

  it('excludes shown ids and banned topicKeys', () => {
    const base = pickIdleFaq('a1', 3, 7)
    expect(base.length).toBeGreaterThan(0)
    const banned = [base[0]!.topicKey]
    const shown = [base[1]!.id]
    const next = pickIdleFaq('a1', 3, 7, { shownIds: shown, bannedTopicKeys: banned })
    expect(next.every((e) => e.id !== base[1]!.id)).toBe(true)
    expect(next.every((e) => e.topicKey !== base[0]!.topicKey)).toBe(true)
    const topics = next.map((e) => e.topicKey)
    expect(new Set(topics).size).toBe(topics.length)
  })

  it('soft-boost does not break unique topicKey', () => {
    const boosted = pickIdleFaq('a1', 3, 11, { boostTopicKeys: ['to_be', 'articles'] })
    const topics = boosted.map((e) => e.topicKey)
    expect(new Set(topics).size).toBe(topics.length)
  })
})
