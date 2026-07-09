import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import type { PracticeDistractorTier } from '@/lib/practice/engine/stepSpec'
import type { PracticeExerciseType } from '@/types/practice'

const CHOICE_LIKE: PracticeExerciseType[] = [
  'choice',
  'dropdown-fill',
  'listening-select',
  'context-clue',
]

export const PRACTICE_CHOICE_MIN_OPTIONS = 3
export const PRACTICE_CHOICE_MAX_OPTIONS = 5

const SOFT_SKIP_OPTION = "I don't know yet"

const TIME_TO_VERBS = ['go', 'sleep', 'eat', 'study', 'rest', 'leave', 'wait', 'open the window']
const STATE_ADJECTIVES = ['cold', 'hot', 'dark', 'late', 'early', 'hungry', 'tired']

export function isChoiceLikePracticeType(type: PracticeExerciseType): boolean {
  return CHOICE_LIKE.includes(type)
}

function normalizeOptionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ')
}

function optionKey(value: string): string {
  return normalizeOptionKey(normalizeEnglishLearnerContractions(value))
}

function appendUniqueOptions(target: string[], candidates: string[], maxLength?: number): void {
  for (const candidate of candidates) {
    if (maxLength != null && target.length >= maxLength) return
    const trimmed = candidate.trim()
    if (!trimmed) continue
    if (target.some((item) => optionKey(item) === optionKey(trimmed))) continue
    target.push(trimmed)
  }
}

function buildPatternDistractors(targetAnswer: string): string[] {
  const distractors: string[] = []
  const normalized = normalizeEnglishLearnerContractions(targetAnswer.trim())
  const stateMatch = normalized.match(/^It's\s+([a-z]+)\.?$/i)
  const timeToMatch = normalized.match(/^It's time to\s+(.+?)\.?$/i)

  if (stateMatch) {
    const adjective = stateMatch[1]!.toLowerCase()
    for (const verb of TIME_TO_VERBS) {
      distractors.push(`It's time to ${verb}.`)
    }
    for (const adjectiveCandidate of STATE_ADJECTIVES) {
      if (adjectiveCandidate === adjective) continue
      distractors.push(`It's ${adjectiveCandidate}.`)
    }
  } else if (timeToMatch) {
    const verbPhrase = timeToMatch[1]!.trim().toLowerCase()
    for (const adjective of STATE_ADJECTIVES) {
      distractors.push(`It's ${adjective}.`)
    }
    for (const verb of TIME_TO_VERBS) {
      if (verbPhrase === verb || verbPhrase.startsWith(`${verb} `)) continue
      distractors.push(`It's time to ${verb}.`)
    }
  }

  if (distractors.length > 0) return distractors
  return [`It's time to go.`, `It's late.`, `It's dark.`, `It's hot.`, `It's time to sleep.`]
}

function withoutSoftSkipOption(options: string[]): string[] {
  const skipKey = optionKey(SOFT_SKIP_OPTION)
  return options.filter((item) => optionKey(item) !== skipKey)
}

export function resolvePracticeChoiceTargetCount(params: {
  tier?: PracticeDistractorTier
  sourceStepOptionCount?: number
}): number {
  const canonicalCount = params.sourceStepOptionCount ?? 0
  if (params.tier === 'obvious') return 3
  if (params.tier === 'semantic-near') return canonicalCount >= 3 ? 3 : 4
  if (params.tier === 'minimal-pair') return canonicalCount >= 3 ? 3 : 4
  return canonicalCount >= 3 ? 3 : PRACTICE_CHOICE_MIN_OPTIONS
}

export type EnsurePracticeChoiceOptionsParams = {
  tier?: PracticeDistractorTier
  targetCount?: number
}

/** Минимум три уникальных варианта; эталон всегда в списке. */
export function ensurePracticeChoiceOptions(
  options: string[] | undefined,
  targetAnswer: string,
  tierOrParams?: PracticeDistractorTier | EnsurePracticeChoiceOptionsParams
): string[] {
  const params =
    typeof tierOrParams === 'string' || tierOrParams == null
      ? { tier: tierOrParams }
      : tierOrParams
  const tier = params.tier
  const targetCount = Math.min(
    params.targetCount ?? resolvePracticeChoiceTargetCount({ tier }),
    PRACTICE_CHOICE_MAX_OPTIONS
  )

  const trimmedTarget = targetAnswer.trim()
  const result = withoutSoftSkipOption(
    Array.from(new Set([trimmedTarget, ...(options ?? [])].map((item) => item.trim()).filter(Boolean)))
  ).filter((item, index, list) => list.findIndex((other) => optionKey(other) === optionKey(item)) === index)

  if (result.length < PRACTICE_CHOICE_MIN_OPTIONS) {
    if (tier === 'obvious') {
      appendUniqueOptions(result, [`It's Tuesday.`, `I'm at home.`, `She is reading.`], targetCount)
    } else {
      appendUniqueOptions(result, buildPatternDistractors(trimmedTarget), targetCount)
    }
  }

  if (result.length < PRACTICE_CHOICE_MIN_OPTIONS) {
    appendUniqueOptions(result, buildPatternDistractors(trimmedTarget), targetCount)
  }

  if (result.length < PRACTICE_CHOICE_MIN_OPTIONS) {
    appendUniqueOptions(result, [`It's time to go.`, `It's late.`, `It's dark.`, `It's hot.`], targetCount)
  }

  return result.slice(0, Math.max(PRACTICE_CHOICE_MIN_OPTIONS, targetCount))
}
