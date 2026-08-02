import { describe, expect, it } from 'vitest'
import { buildTutorMicroPackFromExplain } from '@/lib/tutor/buildMicroPack'
import { isJunkMicroPrompt, isTutorMicroPackEligible } from '@/lib/tutor/microEligible'
import { MICRO_EVAL_FIXTURES } from '@/lib/tutor/microEvalFixtures'
import { resolveTutorMicroPack } from '@/lib/tutor/resolveMicroPack'

describe('micro eval fixtures (local harness)', () => {
  for (const fixture of MICRO_EVAL_FIXTURES) {
    it(`${fixture.id}: local offer=${fixture.expectOfferLocal}`, () => {
      const pack = buildTutorMicroPackFromExplain(fixture.answer)
      if (fixture.expectOfferLocal) {
        expect(pack).not.toBeNull()
        expect(isTutorMicroPackEligible(pack!, fixture.answer)).toBe(true)
        for (const item of pack!.items) {
          expect(isJunkMicroPrompt(item.promptRu)).toBe(false)
          expect(item.promptRu).not.toMatch(/Почему|Как сказать/i)
        }
      } else {
        expect(pack).toBeNull()
        const resolved = resolveTutorMicroPack({ answer: fixture.answer })
        expect(resolved.ok).toBe(false)
      }
    })
  }
})
