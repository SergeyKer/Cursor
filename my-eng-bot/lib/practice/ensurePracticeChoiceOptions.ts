import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import type { PracticeExerciseType } from '@/types/practice'

const CHOICE_LIKE: PracticeExerciseType[] = [
  'choice',
  'dropdown-fill',
  'listening-select',
  'speed-round',
  'context-clue',
]

export const PRACTICE_CHOICE_MIN_OPTIONS = 3

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

function appendUniqueOptions(target: string[], candidates: string[]): void {
  for (const candidate of candidates) {
    if (target.length >= PRACTICE_CHOICE_MIN_OPTIONS) return
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
    const adjective = stateMatch[1].toLowerCase()
    for (const verb of TIME_TO_VERBS) {
      distractors.push(`It's time to ${verb}.`)
    }
    for (const adjectiveCandidate of STATE_ADJECTIVES) {
      if (adjectiveCandidate === adjective) continue
      distractors.push(`It's ${adjectiveCandidate}.`)
    }
  } else if (timeToMatch) {
    const verbPhrase = timeToMatch[1].trim().toLowerCase()
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

/** Минимум три уникальных варианта; эталон всегда в списке. */
export function ensurePracticeChoiceOptions(options: string[] | undefined, targetAnswer: string): string[] {
  const trimmedTarget = targetAnswer.trim()
  const result = withoutSoftSkipOption(
    Array.from(new Set([trimmedTarget, ...(options ?? [])].map((item) => item.trim()).filter(Boolean)))
  ).filter((item, index, list) => list.findIndex((other) => optionKey(other) === optionKey(item)) === index)

  if (result.length < PRACTICE_CHOICE_MIN_OPTIONS) {
    appendUniqueOptions(result, buildPatternDistractors(trimmedTarget))
  }

  if (result.length < PRACTICE_CHOICE_MIN_OPTIONS) {
    appendUniqueOptions(result, [`It's time to go.`, `It's late.`, `It's dark.`, `It's hot.`])
  }

  return result.slice(0, 5)
}
