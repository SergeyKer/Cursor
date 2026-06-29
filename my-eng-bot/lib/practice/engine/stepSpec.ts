import type { PracticeExerciseType, PracticeMode, PracticeSession } from '@/types/practice'

export type PracticeDistractorTier = 'obvious' | 'semantic-near' | 'minimal-pair'
export type PracticeWordBankMode = 'clean' | 'extra'
export type PracticeRouteStageId = 'warmup' | 'understanding' | 'reinforcement' | 'check'

export interface PracticeStepSpec {
  type: PracticeExerciseType
  distractorTier?: PracticeDistractorTier
  wordBankMode?: PracticeWordBankMode
}

export interface PracticeRouteStageRange {
  stageId: PracticeRouteStageId
  fromIndex: number
  toIndex: number
}

const TIER_CAP_BY_MODE: Record<PracticeMode, PracticeDistractorTier | null> = {
  relaxed: 'semantic-near',
  balanced: 'semantic-near',
  challenge: 'minimal-pair',
  reference: null,
}

export const CHALLENGE_STEP_SPECS: readonly PracticeStepSpec[] = [
  { type: 'choice', distractorTier: 'obvious' },
  { type: 'voice-shadow' },
  { type: 'context-clue', distractorTier: 'semantic-near' },
  { type: 'sentence-surgery', wordBankMode: 'clean' },
  { type: 'free-response' },
  { type: 'dropdown-fill', distractorTier: 'semantic-near' },
  { type: 'word-builder-pro', wordBankMode: 'extra' },
  { type: 'dictation' },
  { type: 'listening-select', distractorTier: 'semantic-near' },
  { type: 'roleplay-mini' },
  { type: 'speed-round', distractorTier: 'minimal-pair' },
  { type: 'boss-challenge' },
] as const

export const RELAXED_STEP_SPECS: readonly PracticeStepSpec[] = [
  { type: 'choice', distractorTier: 'obvious' },
  { type: 'sentence-surgery', wordBankMode: 'clean' },
  { type: 'dropdown-fill', distractorTier: 'obvious' },
  { type: 'context-clue', distractorTier: 'semantic-near' },
  { type: 'free-response' },
  { type: 'choice', distractorTier: 'obvious' },
] as const

export const BALANCED_STEP_SPECS: readonly PracticeStepSpec[] = [
  { type: 'choice', distractorTier: 'obvious' },
  { type: 'sentence-surgery', wordBankMode: 'clean' },
  { type: 'listening-select', distractorTier: 'semantic-near' },
  { type: 'free-response' },
  { type: 'context-clue', distractorTier: 'semantic-near' },
  { type: 'dropdown-fill', distractorTier: 'semantic-near' },
  { type: 'word-builder-pro', wordBankMode: 'extra' },
  { type: 'dictation' },
  { type: 'speed-round', distractorTier: 'semantic-near' },
] as const

export const CHALLENGE_ROUTE_STAGES: readonly PracticeRouteStageRange[] = [
  { stageId: 'warmup', fromIndex: 0, toIndex: 1 },
  { stageId: 'understanding', fromIndex: 2, toIndex: 4 },
  { stageId: 'reinforcement', fromIndex: 5, toIndex: 8 },
  { stageId: 'check', fromIndex: 9, toIndex: 11 },
] as const

const SPECS_BY_MODE: Partial<Record<PracticeMode, readonly PracticeStepSpec[]>> = {
  challenge: CHALLENGE_STEP_SPECS,
  balanced: BALANCED_STEP_SPECS,
  relaxed: RELAXED_STEP_SPECS,
}

const TIER_RANK: Record<PracticeDistractorTier, number> = {
  obvious: 0,
  'semantic-near': 1,
  'minimal-pair': 2,
}

function minTier(a: PracticeDistractorTier, b: PracticeDistractorTier): PracticeDistractorTier {
  return TIER_RANK[a] <= TIER_RANK[b] ? a : b
}

export function getPracticeStepSpecs(mode: PracticeMode): readonly PracticeStepSpec[] | null {
  if (mode === 'reference') return null
  return SPECS_BY_MODE[mode] ?? null
}

export function getPracticeStepSpec(mode: PracticeMode, stepIndex: number): PracticeStepSpec | null {
  const specs = getPracticeStepSpecs(mode)
  if (!specs || stepIndex < 0 || stepIndex >= specs.length) return null
  return specs[stepIndex] ?? null
}

export function resolveTierForStep(mode: PracticeMode, spec: PracticeStepSpec): PracticeDistractorTier | undefined {
  if (!spec.distractorTier) return undefined
  const cap = TIER_CAP_BY_MODE[mode]
  if (!cap) return undefined
  return minTier(spec.distractorTier, cap)
}

export function getPracticeStepsForRange(
  mode: PracticeMode,
  fromIndex: number,
  count: number
): Array<PracticeStepSpec & { stepIndex: number }> {
  const specs = getPracticeStepSpecs(mode)
  if (!specs) return []
  return specs.slice(fromIndex, fromIndex + count).map((spec, offset) => {
    const stepIndex = fromIndex + offset
    return {
      ...spec,
      stepIndex,
      distractorTier: resolveTierForStep(mode, specs[stepIndex]!),
    }
  })
}

export function getRouteStageForIndex(mode: PracticeMode, questionIndex: number): PracticeRouteStageRange | null {
  if (mode !== 'challenge') return null
  return (
    CHALLENGE_ROUTE_STAGES.find(
      (stage) => questionIndex >= stage.fromIndex && questionIndex <= stage.toIndex
    ) ?? null
  )
}

export function countWrongChoiceLikeBefore(session: PracticeSession, beforeIndex: number): number {
  let count = 0
  for (const answer of session.answers) {
    const questionIndex = session.questions.findIndex((q) => q.id === answer.questionId)
    if (questionIndex < 0 || questionIndex >= beforeIndex) continue
    const question = session.questions[questionIndex]
    if (!question || answer.isCorrect) continue
    const spec = getPracticeStepSpec(session.mode, questionIndex)
    if (spec?.distractorTier) count += 1
  }
  return count
}

export function resolveAdaptiveTierForStep(
  mode: PracticeMode,
  stepIndex: number,
  choiceLikeWrongCount: number
): PracticeDistractorTier | undefined {
  const base = getPracticeStepSpec(mode, stepIndex)
  if (!base?.distractorTier) return undefined
  const capped = resolveTierForStep(mode, base)
  if (!capped) return undefined
  if (mode !== 'challenge' || stepIndex !== 10) return capped
  return choiceLikeWrongCount > 0 ? 'semantic-near' : capped
}

/** Adaptive tier: downgrade speed-round (step 11) after choice-like errors. */
export function resolveEffectivePracticeStepSpec(
  session: PracticeSession,
  stepIndex: number
): PracticeStepSpec | null {
  const base = getPracticeStepSpec(session.mode, stepIndex)
  if (!base) return null

  const effectiveTier = base.distractorTier ? resolveTierForStep(session.mode, base) : undefined
  if (session.mode !== 'challenge' || stepIndex !== 10) {
    return { ...base, distractorTier: effectiveTier }
  }

  const wrongChoiceLike = countWrongChoiceLikeBefore(session, stepIndex)
  const tier = resolveAdaptiveTierForStep(session.mode, stepIndex, wrongChoiceLike) ?? effectiveTier ?? base.distractorTier
  return { ...base, distractorTier: tier }
}

export function usesPracticeStepSpec(mode: PracticeMode): boolean {
  return mode === 'challenge' || mode === 'balanced' || mode === 'relaxed'
}
