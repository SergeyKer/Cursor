import { getCefrDenyWords, getCefrSpec } from '@/lib/cefr/cefrSpec.server'
import {
  applyCefrOutputGuardWithDeps,
  keepCefrSafeEnglishSentencesWithDeps,
  type CefrGuardResult,
  type GuardMode,
} from '@/lib/cefr/levelGuardCore'

export type { CefrGuardResult, GuardMode } from '@/lib/cefr/levelGuardCore'

const serverDeps = { getCefrSpec, getCefrDenyWords }

export function applyCefrOutputGuard(params: {
  mode: GuardMode
  content: string
  level: import('@/lib/types').LevelId
  audience: import('@/lib/types').Audience
  communicationTargetLang?: 'ru' | 'en'
}): CefrGuardResult {
  return applyCefrOutputGuardWithDeps(serverDeps, params)
}

export function keepCefrSafeEnglishSentences(params: {
  content: string
  level: import('@/lib/types').LevelId
  audience: import('@/lib/types').Audience
}): string {
  return keepCefrSafeEnglishSentencesWithDeps(serverDeps, params)
}
