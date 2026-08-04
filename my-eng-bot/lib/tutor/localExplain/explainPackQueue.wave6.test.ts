import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE6 } from '@/lib/tutor/localExplain/explainPackQueue.wave6'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave6', () => {
  it('has pending stubs for F2 Round3 (75)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE6).toHaveLength(75)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE6)).toHaveLength(75)
  })

  it('matchQueries + sample fixes from review', () => {
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE6) {
      const entry = getLocalFaqById(stub.faqIds[0]!)
      expect(entry).toBeTruthy()
      expect(stub.matchQueries).toContain(entry!.questionRu)
      expect(stub.matchQueries).toContain(entry!.aliases[0])
    }
    expect(getLocalFaqById('a2.agreement.087')?.questionRu).toContain('So am I')
    expect(getLocalFaqById('a2.past_continuous.011')?.questionRu).toContain('тот момент')
    expect(getLocalFaqById('a2.past_simple.010')?.questionRu).toContain('Present Perfect')
  })
})
