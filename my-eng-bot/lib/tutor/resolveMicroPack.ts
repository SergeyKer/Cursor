import { buildTutorMicroPackFromExplain } from '@/lib/tutor/buildMicroPack'
import { isTutorMicroPackEligible } from '@/lib/tutor/microEligible'
import type { TutorExplainAnswer, TutorMicroPack } from '@/lib/tutor/types'

export type ResolveTutorMicroResult =
  | { ok: true; pack: TutorMicroPack; source: 'llm' | 'local' }
  | { ok: false; reason: 'unavailable' | 'failed' }

/**
 * Prefer LLM pack when provided and eligible; else local builder.
 */
export function resolveTutorMicroPack(params: {
  answer: TutorExplainAnswer
  llmPack?: TutorMicroPack | null
}): ResolveTutorMicroResult {
  const { answer, llmPack } = params
  if (llmPack && isTutorMicroPackEligible(llmPack, answer)) {
    return { ok: true, pack: llmPack, source: 'llm' }
  }
  const local = buildTutorMicroPackFromExplain(answer)
  if (local && isTutorMicroPackEligible(local, answer)) {
    return { ok: true, pack: local, source: 'local' }
  }
  return { ok: false, reason: llmPack === null ? 'unavailable' : 'failed' }
}
