import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE7 } from '@/lib/tutor/localExplain/explainPackQueue.wave7'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave7', () => {
  it('has pending stubs for F2 Round4 (75)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE7).toHaveLength(75)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE7)).toHaveLength(75)
  })

  it('matchQueries + review fixes', () => {
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE7) {
      const entry = getLocalFaqById(stub.faqIds[0]!)
      expect(entry).toBeTruthy()
      expect(stub.matchQueries).toContain(entry!.questionRu)
    }
    expect(getLocalFaqById('a2.present_continuous.027')?.questionRu).toContain('I’ll help you')
    expect(getLocalFaqById('a2.present_perfect.025')?.questionRu).toContain('британское')
    expect(getLocalFaqById('b1.agreement.093')?.questionRu).toContain('aren’t I')
    expect(getLocalFaqById('b1.agreement.093')?.questionRu).not.toMatch(/amn’t/i)
    expect(getLocalFaqById('a1.articles.025')?.questionRu).toContain('британское')
    expect(getLocalFaqById('a1.articles.025')?.questionRu).not.toMatch(/BrE|AmE/)
  })
})
