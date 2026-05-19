import { getLessonLearningSteps } from '@/lib/lessonFinale'
import type { ExerciseDifficulty, LessonData } from '@/types/lesson'

export const MAX_CORE_XP_DEFAULT = 140
export const COMBO_XP_CAP = 30

export type LessonMedalTier = 'gold' | 'silver' | 'bronze'
export type LessonMedalTierOrNull = LessonMedalTier | null

export type ScoringUnitKind = 'step' | 'variant' | 'puzzleSub'

export interface LessonScoringUnit {
  id: string
  stepNumber: number
  kind: ScoringUnitKind
  variantIndex?: number
  puzzleSubIndex?: number
  stepWeight: number
  difficulty?: ExerciseDifficulty
}

export type LiveFooterMedalState = 'grey' | 'bronze' | 'silver' | 'gold'

export interface LiveFooterMedalHint {
  current: LiveFooterMedalState
  next: LessonMedalTier | null
}

export interface ComboMilestoneAward {
  combo: number
  xp: number
}

const MEDAL_RANK: Record<string, number> = {
  null: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
}

const STEP_WEIGHT_BY_NUMBER: Record<number, number> = {
  1: 0.8,
  2: 0.8,
  3: 1.0,
  4: 1.1,
  5: 1.3,
  6: 1.2,
  7: 0.9,
}

const DIFFICULTY_MULTIPLIER: Record<ExerciseDifficulty, number> = {
  easy: 0.95,
  medium: 1.0,
  hard: 1.1,
}

const COMBO_MILESTONES: ReadonlyArray<{ combo: number; xp: number }> = [
  { combo: 3, xp: 5 },
  { combo: 5, xp: 10 },
  { combo: 7, xp: 15 },
]

export function getStepWeight(stepNumber: number): number {
  return STEP_WEIGHT_BY_NUMBER[stepNumber] ?? 1
}

export function getAttemptMultiplier(attemptIndex: number): number {
  if (attemptIndex <= 0) return 1
  if (attemptIndex === 1) return 0.75
  return 0.25
}

export function getUnitMaxXp(unit: LessonScoringUnit): number {
  const base = Math.round(10 * unit.stepWeight)
  const difficultyMultiplier = unit.difficulty ? DIFFICULTY_MULTIPLIER[unit.difficulty] : 1
  return Math.round(base * difficultyMultiplier)
}

export function xpForAttempt(unitMax: number, attemptIndex: number): number {
  return Math.floor(unitMax * getAttemptMultiplier(attemptIndex))
}

export function listLessonScoringUnits(lesson: LessonData): LessonScoringUnit[] {
  const steps = getLessonLearningSteps(lesson)
  const units: LessonScoringUnit[] = []

  for (const step of steps) {
    const stepWeight = getStepWeight(step.stepNumber)
    const exercise = step.exercise
    if (!exercise) continue

    const variants = exercise.variants ?? []
    if (variants.length > 0) {
      variants.forEach((variant, variantIndex) => {
        units.push({
          id: `s${step.stepNumber}-v${variantIndex}`,
          stepNumber: step.stepNumber,
          kind: 'variant',
          variantIndex,
          stepWeight,
          difficulty: variant.difficulty,
        })
      })
      continue
    }

    const puzzleVariants = exercise.puzzleVariants ?? []
    if (puzzleVariants.length > 0) {
      puzzleVariants.forEach((_, puzzleSubIndex) => {
        units.push({
          id: `s${step.stepNumber}-p${puzzleSubIndex}`,
          stepNumber: step.stepNumber,
          kind: 'puzzleSub',
          puzzleSubIndex,
          stepWeight,
          difficulty: 'medium',
        })
      })
      continue
    }

    units.push({
      id: `s${step.stepNumber}`,
      stepNumber: step.stepNumber,
      kind: 'step',
      stepWeight,
    })
  }

  return units
}

export function sumMaxCoreXpForLesson(lesson: LessonData): number {
  return listLessonScoringUnits(lesson).reduce((sum, unit) => sum + getUnitMaxXp(unit), 0)
}

export function computeCorePercent(coreXp: number, maxCoreXp: number = MAX_CORE_XP_DEFAULT): number {
  if (maxCoreXp <= 0) return 0
  return Math.round((coreXp / maxCoreXp) * 100)
}

export function computeStrengthPercent(totalXp: number, maxCoreXp: number = MAX_CORE_XP_DEFAULT): number {
  if (maxCoreXp <= 0) return 0
  return Math.round((totalXp / maxCoreXp) * 100)
}

export function resolveMedal(corePercent: number, completed: boolean): LessonMedalTierOrNull {
  if (!completed) return null
  if (corePercent >= 90) return 'gold'
  if (corePercent >= 50) return 'silver'
  return 'bronze'
}

export function resolveMedalFromCoreXp(
  coreXp: number,
  completed: boolean,
  maxCoreXp: number = MAX_CORE_XP_DEFAULT
): LessonMedalTierOrNull {
  return resolveMedal(computeCorePercent(coreXp, maxCoreXp), completed)
}

export function upgradeMedal(
  current: LessonMedalTierOrNull,
  next: LessonMedalTierOrNull
): LessonMedalTierOrNull {
  if (!next) return current
  if (!current) return next
  return MEDAL_RANK[next] > MEDAL_RANK[current] ? next : current
}

export function resolveLiveFooterMedal(coreXp: number, maxCoreXp: number = MAX_CORE_XP_DEFAULT): LiveFooterMedalHint {
  if (coreXp <= 0) {
    return { current: 'grey', next: 'bronze' }
  }

  const percent = computeCorePercent(coreXp, maxCoreXp)
  if (percent >= 90) {
    return { current: 'gold', next: null }
  }
  if (percent >= 50) {
    return { current: 'silver', next: 'gold' }
  }
  return { current: 'bronze', next: 'silver' }
}

export function coreXpToNextMedalTier(coreXp: number, maxCoreXp: number = MAX_CORE_XP_DEFAULT): number | null {
  const hint = resolveLiveFooterMedal(coreXp, maxCoreXp)
  if (!hint.next) return null

  const percent = computeCorePercent(coreXp, maxCoreXp)
  if (hint.next === 'silver') {
    return Math.max(0, Math.ceil(maxCoreXp * 0.5) - coreXp)
  }
  if (hint.next === 'gold') {
    return Math.max(0, Math.ceil(maxCoreXp * 0.9) - coreXp)
  }
  return Math.max(0, 1 - coreXp)
}

export function coreXpToGold(coreXp: number, maxCoreXp: number = MAX_CORE_XP_DEFAULT): number {
  return Math.max(0, Math.ceil(maxCoreXp * 0.9) - coreXp)
}

export function getComboMilestoneXp(
  combo: number,
  claimedMilestones: ReadonlySet<number>
): ComboMilestoneAward | null {
  const milestone = COMBO_MILESTONES.find((item) => item.combo === combo)
  if (!milestone || claimedMilestones.has(combo)) return null
  return { combo: milestone.combo, xp: milestone.xp }
}

export function applyComboXpAward(currentComboXp: number, awardXp: number): number {
  return Math.min(COMBO_XP_CAP, currentComboXp + awardXp)
}

export interface MedalAggregate {
  gold: number
  silver: number
  bronze: number
  totalLessons: number
}

export function aggregateMedals(
  medals: ReadonlyArray<LessonMedalTierOrNull>,
  totalLessons: number
): MedalAggregate {
  let gold = 0
  let silver = 0
  let bronze = 0
  for (const medal of medals) {
    if (medal === 'gold') gold += 1
    else if (medal === 'silver') silver += 1
    else if (medal === 'bronze') bronze += 1
  }
  return { gold, silver, bronze, totalLessons }
}

export function findScoringUnit(
  lesson: LessonData,
  params: {
    stepNumber: number
    variantIndex?: number
    puzzleSubIndex?: number
  }
): LessonScoringUnit | null {
  const units = listLessonScoringUnits(lesson)
  return (
    units.find((unit) => {
      if (unit.stepNumber !== params.stepNumber) return false
      if (params.puzzleSubIndex !== undefined) {
        return unit.kind === 'puzzleSub' && unit.puzzleSubIndex === params.puzzleSubIndex
      }
      if (params.variantIndex !== undefined) {
        return unit.kind === 'variant' && unit.variantIndex === params.variantIndex
      }
      return unit.kind === 'step'
    }) ?? null
  )
}

export function awardCoreXpForUnit(
  lesson: LessonData,
  params: {
    stepNumber: number
    variantIndex?: number
    puzzleSubIndex?: number
    attemptIndex: number
  }
): number {
  const unit = findScoringUnit(lesson, params)
  if (!unit) return 0
  return xpForAttempt(getUnitMaxXp(unit), params.attemptIndex)
}
