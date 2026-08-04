import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE1 } from '@/lib/tutor/localExplain/explainPackQueue.wave1'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalExplainPackByFaqId } from '@/lib/tutor/localExplain/lookup'

describe('explainPackQueue wave1', () => {
  it('has 31 stubs and only age pack is saved', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE1).toHaveLength(31)
    const saved = EXPLAIN_PACK_QUEUE_WAVE1.filter((s) => s.status === 'saved')
    expect(saved).toHaveLength(1)
    expect(saved[0]?.faqIds).toEqual(['a1.mistakes.131'])
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE1)).toHaveLength(30)
  })

  it('does not wire pending faq ids into live lookup', () => {
    for (const stub of listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE1)) {
      const faqId = stub.faqIds[0]
      expect(faqId).toBeTruthy()
      expect(getLocalExplainPackByFaqId(faqId!)).toBeNull()
    }
  })
})
