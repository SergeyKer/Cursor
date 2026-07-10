import type { PracticeDistractorTier } from '@/lib/practice/engine/stepSpec'
import { resolveDropdownOptionCount } from '@/lib/practice/dropdownOptionCount'
import type { LessonData } from '@/types/lesson'

export type GapWordSlot =
  | 'country'
  | 'article'
  | 'verb_base'
  | 'adjective'
  | 'auxiliary'
  | 'past_participle'
  | 'preposition'
  | 'unknown'

const ARTICLES = new Set(['a', 'an', 'the'])
const AUXILIARIES = new Set(['have', 'has', 'had', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'am'])
const PREPOSITIONS = new Set(['for', 'since', 'in', 'at', 'on', 'to', 'from', 'by', 'with'])
const TIME_TO_VERBS = [
  'go',
  'sleep',
  'eat',
  'study',
  'rest',
  'leave',
  'wait',
  'drink',
  'read',
  'work',
  'walk',
  'take',
]
const STATE_ADJECTIVES = ['cold', 'hot', 'dark', 'late', 'early', 'hungry', 'tired', 'happy', 'calm', 'sad']

/** Country pool aligned with lesson 4 step 7 contrast + common A1 countries. */
export const DEFAULT_COUNTRY_POOL = [
  'Russia',
  'Spain',
  'France',
  'Germany',
  'Britain',
  'Italy',
  'Canada',
  'Japan',
  'Brazil',
  'Mexico',
] as const

export type InferGapWordSlotParams = {
  targetAnswer: string
  prompt?: string
  answerFormat?: string
  sourcePattern?: string
}

function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function extractGapFrame(prompt?: string): string {
  if (!prompt) return ''
  const quoted = prompt.match(/["«]([^"»]+___[^"»]+)["»]/i)?.[1]
  if (quoted) return quoted
  const dashFrame = prompt.match(/[-—]\s*["«]([^"»]+)["»]/i)?.[1]
  if (dashFrame?.includes('___')) return dashFrame
  return prompt
}

export function inferGapWordSlot(params: InferGapWordSlotParams): GapWordSlot {
  const target = normalizeWord(params.targetAnswer)
  const frame = extractGapFrame(params.prompt).toLowerCase()
  const sourcePattern = params.sourcePattern?.toLowerCase() ?? ''

  if (sourcePattern.includes('country') || /\bfrom\s+___/i.test(frame) || /\bfrom\s+___/i.test(params.prompt ?? '')) {
    return 'country'
  }
  if (ARTICLES.has(target) || /\bi am ___/i.test(frame) || /___\s+\w+/i.test(frame) && ARTICLES.has(target)) {
    return 'article'
  }
  if (/\btime to\s+___/i.test(frame) || sourcePattern.includes('time to')) {
    return 'verb_base'
  }
  if (/\bi'?m\s+___/i.test(frame) && !/\bfrom\b/i.test(frame)) {
    return 'adjective'
  }
  if (AUXILIARIES.has(target) && (/\b___\s+(?:have|has|had|been|lived|done)/i.test(frame) || /\bi\s+___/i.test(frame))) {
    return 'auxiliary'
  }
  if (/\b(?:have|has|had)\s+___/i.test(frame)) {
    return 'past_participle'
  }
  if (PREPOSITIONS.has(target) && (/\b___\s+\d{4}/i.test(frame) || /\bfor\s+\d+/i.test(frame) || sourcePattern.includes('since'))) {
    return 'preposition'
  }
  if (ARTICLES.has(target)) return 'article'
  if (AUXILIARIES.has(target)) return 'auxiliary'
  if (PREPOSITIONS.has(target)) return 'preposition'
  if (DEFAULT_COUNTRY_POOL.some((country) => normalizeWord(country) === target)) return 'country'
  if (STATE_ADJECTIVES.includes(target)) return 'adjective'
  if (TIME_TO_VERBS.includes(target)) return 'verb_base'
  return 'unknown'
}

export function isOptionCompatibleWithSlot(
  option: string,
  slot: GapWordSlot,
  targetAnswer: string
): boolean {
  const normalized = normalizeWord(option)
  if (!normalized || normalized.includes(' ')) return false
  const targetSlot = inferGapWordSlot({ targetAnswer: option, prompt: '' })
  if (slot === 'unknown') return true
  if (targetSlot === slot) return true
  if (slot === 'country' && ARTICLES.has(normalized)) return false
  if (slot === 'article' && !ARTICLES.has(normalized)) return false
  if (slot === 'country' && DEFAULT_COUNTRY_POOL.some((c) => normalizeWord(c) === normalized)) return true
  return targetSlot === slot
}

function collectCountriesFromLesson(lesson?: LessonData): string[] {
  const fromProfiles =
    lesson?.repeatConfig?.variantProfiles
      ?.flatMap((profile) => {
        const fields = profile as unknown as Record<string, unknown>
        const values = [fields.country, fields.step6CreativeCountry, fields.step3FillWord]
        return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      }) ?? []
  return Array.from(new Set([...DEFAULT_COUNTRY_POOL, ...fromProfiles]))
}

function pickNearCountries(target: string, pool: string[], count: number): string[] {
  const targetKey = normalizeWord(target)
  const distractors = pool.filter((item) => normalizeWord(item) !== targetKey)
  return distractors.slice(0, Math.max(0, count - 1))
}

export function buildSlotAwareWordDistractors(params: {
  slot: GapWordSlot
  targetAnswer: string
  tier?: PracticeDistractorTier
  lesson?: LessonData
  targetCount?: number
}): string[] {
  const target = params.targetAnswer.trim()
  const targetKey = normalizeWord(target)
  const count = params.targetCount ?? resolveDropdownOptionCount({
    slot: params.slot,
    lesson: params.lesson,
    tier: params.tier,
  })

  let pool: string[] = []
  switch (params.slot) {
    case 'country':
      pool = pickNearCountries(target, collectCountriesFromLesson(params.lesson), count)
      break
    case 'article':
      pool = ['a', 'an', 'the'].filter((item) => normalizeWord(item) !== targetKey)
      break
    case 'verb_base':
      pool = TIME_TO_VERBS.filter((item) => normalizeWord(item) !== targetKey)
      break
    case 'adjective':
      pool = STATE_ADJECTIVES.filter((item) => normalizeWord(item) !== targetKey)
      break
    case 'auxiliary':
      pool = Array.from(AUXILIARIES).filter((item) => normalizeWord(item) !== targetKey)
      break
    case 'preposition':
      pool = Array.from(PREPOSITIONS).filter((item) => normalizeWord(item) !== targetKey)
      break
    case 'past_participle':
      pool = ['been', 'gone', 'went', 'eaten', 'ate', 'lived', 'done'].filter(
        (item) => normalizeWord(item) !== targetKey
      )
      break
    default:
      pool = []
  }

  const result = [target]
  for (const item of pool) {
    if (result.length >= count) break
    if (result.some((existing) => normalizeWord(existing) === normalizeWord(item))) continue
    result.push(item)
  }
  return result.slice(0, count)
}

export function validateDropdownFillOptions(params: {
  options: string[]
  targetAnswer: string
  prompt?: string
  slot?: GapWordSlot
  targetCount?: number
}): boolean {
  const slot = params.slot ?? inferGapWordSlot({ targetAnswer: params.targetAnswer, prompt: params.prompt })
  const count = params.targetCount ?? resolveDropdownOptionCount({ slot })
  if (params.options.length < 3 || params.options.length > count + 1) return false
  const normalizedTarget = normalizeWord(params.targetAnswer)
  if (!params.options.some((item) => normalizeWord(item) === normalizedTarget)) return false
  return params.options.every((item) => isOptionCompatibleWithSlot(item, slot, params.targetAnswer))
}
