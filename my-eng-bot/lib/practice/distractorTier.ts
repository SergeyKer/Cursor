import { ensurePracticeChoiceOptions } from '@/lib/practice/ensurePracticeChoiceOptions'
import type { PracticeDistractorTier, PracticeWordBankMode } from '@/lib/practice/engine/stepSpec'

const OBVIOUS_DISTRACTORS = [
  "It's Tuesday.",
  "I'm at home.",
  'The weather is nice.',
  'She is reading.',
  'We are late.',
]

const SEMANTIC_NEAR_BY_STATE: Record<string, string[]> = {
  hungry: ['thirsty', 'tired'],
  thirsty: ['hungry', 'tired'],
  tired: ['hungry', 'sleepy'],
  cold: ['hot', 'dark'],
  hot: ['cold', 'warm'],
  dark: ['cold', 'late'],
  late: ['early', 'tired'],
  early: ['late', 'tired'],
}

function tokenCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function sentencePattern(value: string): string | null {
  const normalized = value.trim()
  if (/^It's\b/i.test(normalized)) return 'its'
  if (/^I'm\b/i.test(normalized)) return 'im'
  if (/^It's time to\b/i.test(normalized)) return 'time-to'
  return null
}

function contentTokens(value: string): Set<string> {
  return new Set(
    value
      .replace(/[.!?]/g, '')
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 1 && !["it's", "i'm", 'the', 'a', 'an', 'to'].includes(token))
  )
}

function tokensOverlap(a: string, b: string): boolean {
  const aTokens = contentTokens(a)
  for (const token of contentTokens(b)) {
    if (aTokens.has(token)) return true
  }
  return false
}

function isWrongLessonOption(option: string, targetAnswer: string): boolean {
  return option.trim().toLowerCase() !== targetAnswer.trim().toLowerCase()
}

function pickLessonDistractorsForTier(
  targetAnswer: string,
  tier: PracticeDistractorTier,
  lessonOptions: string[]
): string[] {
  const wrong = lessonOptions.filter((item) => isWrongLessonOption(item, targetAnswer))
  if (wrong.length === 0) return []

  const targetPattern = sentencePattern(targetAnswer)

  if (tier === 'obvious') {
    return wrong.filter((item) => {
      const pattern = sentencePattern(item)
      if (targetPattern && pattern && pattern !== targetPattern) return true
      return !tokensOverlap(item, targetAnswer)
    })
  }

  if (tier === 'semantic-near') {
    const semantic = wrong.filter((item) => {
      const pattern = sentencePattern(item)
      if (targetPattern && pattern === targetPattern) return true
      return tokensOverlap(item, targetAnswer)
    })
    return semantic.length > 0 ? semantic : wrong
  }

  const minimal = wrong.filter((item) => {
    const targetWord = targetAnswer.replace(/[.!?]/g, '').trim().split(/\s+/).pop() ?? ''
    const itemWord = item.replace(/[.!?]/g, '').trim().split(/\s+/).pop() ?? ''
    if (!targetWord || !itemWord) return false
    if (Math.abs(targetWord.length - itemWord.length) > 2) return false
    return targetWord.toLowerCase() !== itemWord.toLowerCase()
  })
  return minimal.length > 0 ? minimal : wrong
}

function buildObviousDistractors(targetAnswer: string): string[] {
  const normalized = targetAnswer.trim()
  const result: string[] = []
  for (const candidate of OBVIOUS_DISTRACTORS) {
    if (candidate.toLowerCase() !== normalized.toLowerCase()) result.push(candidate)
    if (result.length >= 4) break
  }
  return result
}

function buildSemanticNearDistractors(targetAnswer: string): string[] {
  const normalized = targetAnswer.trim()
  const stateMatch = normalized.match(/^It's\s+([a-z]+)\.?$/i)
  if (stateMatch) {
    const key = stateMatch[1]!.toLowerCase()
    const near = SEMANTIC_NEAR_BY_STATE[key] ?? ['tired', 'hungry']
    return near.map((word) => `It's ${word}.`)
  }
  const hungryMatch = normalized.match(/^I'm\s+([a-z]+)\.?$/i)
  if (hungryMatch) {
    const key = hungryMatch[1]!.toLowerCase()
    const near = SEMANTIC_NEAR_BY_STATE[key] ?? ['tired', 'thirsty']
    return near.map((word) => `I'm ${word}.`)
  }
  return [`I'm tired.`, `I'm thirsty.`, `It's late.`]
}

function buildMinimalPairDistractors(targetAnswer: string): string[] {
  if (tokenCount(targetAnswer) > 3) {
    return buildSemanticNearDistractors(targetAnswer)
  }
  const word = targetAnswer.replace(/[.!?]/g, '').trim().split(/\s+/).pop() ?? targetAnswer
  const lower = word.toLowerCase()
  const variants = new Set<string>()
  if (lower.endsWith('y')) variants.add(`${word.slice(0, -1)}ie`)
  variants.add(`${word}s`)
  variants.add(`${word}e`)
  if (lower.includes('ie')) variants.add(word.replace(/ie/i, 'ei'))
  if (word.length > 2) variants.add(`${word.slice(0, -1)}${word.slice(-1)}${word.slice(-1)}`)
  return Array.from(variants)
    .filter((item) => item.toLowerCase() !== word.toLowerCase())
    .slice(0, 3)
    .map((item) => targetAnswer.replace(new RegExp(`${word}$`), item))
}

function genericDistractorsForTier(targetAnswer: string, tier: PracticeDistractorTier): string[] {
  if (tier === 'obvious') return buildObviousDistractors(targetAnswer)
  if (tier === 'minimal-pair') return buildMinimalPairDistractors(targetAnswer)
  return buildSemanticNearDistractors(targetAnswer)
}

export function buildTieredChoiceOptions(
  targetAnswer: string,
  tier: PracticeDistractorTier,
  lessonOptions?: string[]
): string[] {
  const fromLesson = pickLessonDistractorsForTier(targetAnswer, tier, lessonOptions ?? [])
  const generic = genericDistractorsForTier(targetAnswer, tier)
  return ensurePracticeChoiceOptions([...fromLesson, ...generic], targetAnswer, tier)
}

export function buildWordBankExtraWords(targetAnswer: string, mode: PracticeWordBankMode): string[] | undefined {
  if (mode !== 'extra') return undefined
  const tokens = targetAnswer.replace(/[.!?]$/g, '').split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ['go', 'the']
  const extras: string[] = []
  if (tokens.some((t) => t.toLowerCase() === 'to')) extras.push('go')
  if (tokens.some((t) => /^a$/i.test(t))) extras.push('an')
  if (extras.length === 0) extras.push('to', 'go')
  return extras.slice(0, 2)
}
