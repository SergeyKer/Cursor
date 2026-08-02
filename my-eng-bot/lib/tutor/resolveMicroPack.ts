import { isTutorMicroPackEligible } from '@/lib/tutor/microEligible'
import type { TutorExplainAnswer, TutorMicroPack } from '@/lib/tutor/types'

export type ResolveTutorMicroResult =
  | { ok: true; pack: TutorMicroPack; source: 'llm' }
  | { ok: false; reason: 'unavailable' | 'failed' }

/**
 * Product path: LLM pack only. No local builder fallback.
 */
export function resolveTutorMicroPack(params: {
  answer: TutorExplainAnswer
  llmPack?: TutorMicroPack | null
}): ResolveTutorMicroResult {
  const { answer, llmPack } = params
  if (llmPack && isTutorMicroPackEligible(llmPack, answer)) {
    return { ok: true, pack: llmPack, source: 'llm' }
  }
  return { ok: false, reason: llmPack === null ? 'unavailable' : 'failed' }
}
