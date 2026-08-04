import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE5 } from '@/lib/tutor/localExplain/explainPackQueue.wave5'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave5', () => {
  it('has pending stubs for F2 Round2 A1 grammar (75)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE5).toHaveLength(75)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE5)).toHaveLength(75)
    expect(EXPLAIN_PACK_QUEUE_WAVE5.every((s) => s.status === 'pending')).toBe(true)
  })

  it('matchQueries include new questionRu and old alias; sample fixes', () => {
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE5) {
      const faqId = stub.faqIds[0]!
      const entry = getLocalFaqById(faqId)
      expect(entry).toBeTruthy()
      expect(stub.matchQueries).toContain(entry!.questionRu)
      expect(stub.matchQueries).toContain(entry!.aliases[0])
    }
    expect(getLocalFaqById('a1.imperative.091')?.questionRu).toBe(
      'Почему зовут вместе через «Let’s go!», а не просто «Go!»?'
    )
    expect(getLocalFaqById('a1.предлоги.073')?.questionRu).toContain('from')
    expect(getLocalFaqById('a1.articles.026')?.questionRu).toContain('some water')
  })
})
