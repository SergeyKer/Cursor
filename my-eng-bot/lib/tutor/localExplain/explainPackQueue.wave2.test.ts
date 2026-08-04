import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE2 } from '@/lib/tutor/localExplain/explainPackQueue.wave2'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave2', () => {
  it('has pending stubs for batches A–C', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE2).toHaveLength(75)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE2)).toHaveLength(75)
    expect(EXPLAIN_PACK_QUEUE_WAVE2.every((s) => s.status === 'pending')).toBe(true)
  })

  it('matchQueries include new questionRu and old alias', () => {
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE2) {
      const faqId = stub.faqIds[0]!
      const entry = getLocalFaqById(faqId)
      expect(entry).toBeTruthy()
      expect(stub.matchQueries).toContain(entry!.questionRu)
      const old = entry!.aliases[0]
      expect(old).toBeTruthy()
      expect(stub.matchQueries).toContain(old)
    }
  })
})
