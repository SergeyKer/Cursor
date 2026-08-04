import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE10 } from '@/lib/tutor/localExplain/explainPackQueue.wave10'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById, localFaqPoolSize } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave10', () => {
  it('has pending stubs for F3 residual (12)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE10).toHaveLength(12)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE10)).toHaveLength(12)
  })

  it('F3 chips + catalog still 584', () => {
    expect(getLocalFaqById('b2.collocations.170')?.questionRu).toContain('I did a mistake')
    expect(getLocalFaqById('a1.to_be.013')?.questionRu).toContain('Yes, I am')
    expect(getLocalFaqById('a1.present_continuous.042')?.questionRu).toContain('I work every day')
    expect(localFaqPoolSize()).toBe(584)
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE10) {
      expect(getLocalFaqById(stub.faqIds[0]!)).toBeTruthy()
      expect(stub.matchQueries).toContain(getLocalFaqById(stub.faqIds[0]!)!.questionRu)
    }
  })
})
