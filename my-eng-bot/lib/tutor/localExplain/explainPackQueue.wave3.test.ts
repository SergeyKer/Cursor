import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE3 } from '@/lib/tutor/localExplain/explainPackQueue.wave3'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave3', () => {
  it('has pending stubs for F1 batches A–D (46)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE3).toHaveLength(46)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE3)).toHaveLength(46)
    expect(EXPLAIN_PACK_QUEUE_WAVE3.every((s) => s.status === 'pending')).toBe(true)
  })

  it('matchQueries include new questionRu and old alias', () => {
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE3) {
      const faqId = stub.faqIds[0]!
      const entry = getLocalFaqById(faqId)
      expect(entry).toBeTruthy()
      expect(stub.matchQueries).toContain(entry!.questionRu)
      const old = entry!.aliases[0]
      expect(old).toBeTruthy()
      expect(stub.matchQueries).toContain(old)
    }
  })

  it('batch A mistags are genre phrase', () => {
    for (const id of [
      'a1.functional.117',
      'a1.functional.118',
      'a1.functional.119',
      'a1.functional.122',
      'a1.functional.123',
      'a1.functional.124',
      'a1.functional.125',
    ]) {
      expect(getLocalFaqById(id)?.genre).toBe('phrase')
    }
  })
})
