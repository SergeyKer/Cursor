import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE11 } from '@/lib/tutor/localExplain/explainPackQueue.wave11'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById, localFaqPoolSize } from '@/lib/tutor/localFaq/catalog'

describe('explainPackQueue wave11', () => {
  it('has pending stubs for F4 differentiate (11)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE11).toHaveLength(11)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE11)).toHaveLength(11)
  })

  it('F4 chips differentiated; catalog 584; ids not merged', () => {
    expect(getLocalFaqById('a1.указательные_и_количественные_слова.099')?.questionRu).not.toBe(
      getLocalFaqById('a2.quantifiers.042')?.questionRu
    )
    expect(getLocalFaqById('a2.mistakes.103')?.questionRu).not.toBe(
      getLocalFaqById('a2.past_simple.009')?.questionRu
    )
    expect(getLocalFaqById('b1.mistakes.115')?.questionRu).not.toBe(
      getLocalFaqById('b2.mistakes.104')?.questionRu
    )
    expect(getLocalFaqById('b1.gerunds_infinitives.057')?.questionRu).toContain('Когда')
    expect(getLocalFaqById('a2.gerunds_infinitives.059')?.questionRu).toContain('Чем')
    expect(localFaqPoolSize()).toBe(584)
    for (const stub of EXPLAIN_PACK_QUEUE_WAVE11) {
      expect(getLocalFaqById(stub.faqIds[0]!)).toBeTruthy()
      expect(stub.matchQueries).toContain(getLocalFaqById(stub.faqIds[0]!)!.questionRu)
    }
  })
})
