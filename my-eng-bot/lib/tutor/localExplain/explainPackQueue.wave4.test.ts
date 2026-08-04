import { describe, expect, it } from 'vitest'
import { EXPLAIN_PACK_QUEUE_WAVE4 } from '@/lib/tutor/localExplain/explainPackQueue.wave4'
import { listPendingExplainPackStubs } from '@/lib/tutor/localExplain/explainPackStub'
import { getLocalFaqById } from '@/lib/tutor/localFaq/catalog'

const ROUND1_IDS = [
  143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157,
  158, 159, 160, 161, 162, 163, 164, 165, 167, 168, 169, 170, 171, 172, 175,
  176, 177, 178, 179, 180, 181, 182, 183, 184, 190, 192, 193, 194, 195, 196,
  197, 198, 199,
].map((n) => `a1.еще_полезные_микро_вопросы_a1.${n}`)

describe('explainPackQueue wave4', () => {
  it('has pending stubs for F2 Round1 micro (48)', () => {
    expect(EXPLAIN_PACK_QUEUE_WAVE4).toHaveLength(48)
    expect(listPendingExplainPackStubs(EXPLAIN_PACK_QUEUE_WAVE4)).toHaveLength(48)
    expect(EXPLAIN_PACK_QUEUE_WAVE4.every((s) => s.status === 'pending')).toBe(true)
  })

  it('covers Round1 faq ids and matchQueries include new + old', () => {
    const covered = new Set(EXPLAIN_PACK_QUEUE_WAVE4.flatMap((s) => [...s.faqIds]))
    for (const id of ROUND1_IDS) {
      expect(covered.has(id)).toBe(true)
      const entry = getLocalFaqById(id)
      expect(entry).toBeTruthy()
      expect(entry!.genre).toBe('phrase')
      const stub = EXPLAIN_PACK_QUEUE_WAVE4.find((s) => s.faqIds.includes(id))!
      expect(stub.matchQueries).toContain(entry!.questionRu)
      expect(stub.matchQueries).toContain(entry!.aliases[0])
    }
  })
})
