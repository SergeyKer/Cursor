import {
  buildReferenceSheetFromTutorExplain,
  generateReferenceSheet,
  type GenerateReferenceSheetParams,
} from '@/lib/reference/generateReferenceSheet'
import type { ReferenceSheet } from '@/lib/reference/types'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export type ResolveGroundedCheatsheetSheetParams = {
  answer: TutorExplainAnswer
  query: string
  level: LevelId
  audience: Audience
  provider: AiProvider
  openAiChatPreset?: GenerateReferenceSheetParams['openAiChatPreset']
  generate?: typeof generateReferenceSheet
  buildLocal?: typeof buildReferenceSheetFromTutorExplain
}

export type ResolveGroundedCheatsheetSheetResult =
  | { kind: 'opened'; sheet: ReferenceSheet; source: 'generated' | 'local' }
  | { kind: 'missing' }

/**
 * Grounded cheatsheet materialize: LLM first, local Explain pack on reject/fail.
 */
export async function resolveGroundedCheatsheetSheet(
  params: ResolveGroundedCheatsheetSheetParams
): Promise<ResolveGroundedCheatsheetSheetResult> {
  const generate = params.generate ?? generateReferenceSheet
  const buildLocal = params.buildLocal ?? buildReferenceSheetFromTutorExplain
  const query = params.query.trim()
  const generated = await generate({
    query,
    generateQuery: query,
    level: params.level,
    audience: params.audience,
    provider: params.provider,
    openAiChatPreset: params.openAiChatPreset,
    groundedExplain: params.answer,
  })
  if (generated.kind === 'generated') {
    return { kind: 'opened', sheet: generated.sheet, source: 'generated' }
  }
  const localSheet = buildLocal(params.answer, params.level)
  if (localSheet) {
    return { kind: 'opened', sheet: localSheet, source: 'local' }
  }
  return { kind: 'missing' }
}
