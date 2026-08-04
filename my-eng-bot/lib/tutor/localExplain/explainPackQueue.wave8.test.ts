import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE8 } from '@/lib/tutor/localExplain/explainPackQueue.wave8'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave8', () => {
  it('has pending stubs for F2 Round5 (75)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE8).toHaveLength(75)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE8)).toHaveLength(75)
  })

  it('matchQueries + situation template samples', () => {
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE8) {
      const entry = getLocalFaqById(stub.faqIds[0]!)
      expect(entry).toBeTruthy()
      expect(stub.matchQueries).toContain(entry!.questionRu)
      expect(stub.matchQueries).toContain(entry!.aliases[0])
    }
    expect(getLocalFaqById('b1.conditionals.025')?.questionRu).toContain('жалеют о прошлом')
    expect(getLocalFaqById('b1.final_mixed_block.181')?.questionRu).toContain('The thing is')
  })
})
