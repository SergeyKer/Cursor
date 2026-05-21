import { getCefrDenyWords, getCefrSpec } from '@/lib/cefr/cefrSpec'
import {
  applyCefrOutputGuardWithDeps,
  type CefrGuardResult,
  type GuardMode,
} from '@/lib/cefr/levelGuardCore'
import type { Audience, LevelId } from '@/lib/types'

export type { CefrGuardResult } from '@/lib/cefr/levelGuardCore'

const clientDeps = { getCefrSpec, getCefrDenyWords }

export function applyCefrOutputGuardClient(params: {
  mode: GuardMode
  content: string
  level: LevelId
  audience: Audience
  communicationTargetLang?: 'ru' | 'en'
}): CefrGuardResult {
  return applyCefrOutputGuardWithDeps(clientDeps, params)
}
