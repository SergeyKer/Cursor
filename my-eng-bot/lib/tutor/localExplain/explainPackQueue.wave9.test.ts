import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE9 } from '@/lib/tutor/localExplain/explainPackQueue.wave9'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById, localFaqPoolSize } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave9', () => {
  it('has pending stubs for F2 Round6 (56 = 55 + new 007)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE9).toHaveLength(56)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE9)).toHaveLength(56)
  })

  it('Japan / known / today-week chips', () => {
    expect(getLocalFaqById('b1.past_simple.003')?.questionRu).toContain('бывал')
    expect(getLocalFaqById('b1.past_simple.003')?.popularity).toBe(92)
    expect(getLocalFaqById('b1.past_simple.005')?.questionRu).toContain('been knowing')
    expect(getLocalFaqById('b1.past_simple.006')?.questionRu).toContain('британцы')
    expect(getLocalFaqById('b1.past_simple.007')?.questionRu).toContain('this week')
    expect(localFaqPoolSize()).toBe(584)
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE9) {
      expect(getLocalFaqById(stub.faqIds[0]!)).toBeTruthy()
      expect(stub.matchQueries).toContain(getLocalFaqById(stub.faqIds[0]!)!.questionRu)
    }
  })
})
