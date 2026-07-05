import { isWordBuilderTrapAllowed } from '@/lib/practice/assertWordBuilderBankValid'
import type { LessonData } from '@/types/lesson'

const FUNCTION_WORDS = new Set([
  'i',
  'am',
  'is',
  'are',
  'an',
  'a',
  'the',
  'to',
  'from',
  "it's",
  "i'm",
  'at',
  'in',
  'on',
  'of',
  'for',
  'and',
  'or',
])

export const GRAMMAR_TRAP_WHITELIST = new Set(['a', 'an', 'the'])

function normalizeTrapToken(token: string): string {
  return token.replace(/[.,!?]/g, '').trim().toLowerCase()
}

function tokenizeAnswer(targetAnswer: string): string[] {
  return targetAnswer
    .replace(/[.!?]$/g, '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function morphVariantsForToken(token: string): string[] {
  const cleaned = token.replace(/[.,!?]/g, '').trim()
  if (!cleaned) return []
  const lower = cleaned.toLowerCase()
  const variants = new Set<string>()

  if (lower === 'go' || lower === 'do' || /[^aeiou]o$/i.test(cleaned)) {
    variants.add(`${cleaned}es`)
  } else if (
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('z') ||
    lower.endsWith('ch') ||
    lower.endsWith('sh')
  ) {
    variants.add(`${cleaned}es`)
  } else {
    variants.add(`${cleaned}s`)
  }
  variants.add(`${cleaned}ing`)

  return Array.from(variants).filter((item) => item.toLowerCase() !== lower)
}

function buildGrammarTraps(tokens: string[]): string[] {
  const traps: string[] = []
  const seen = new Set<string>()

  const add = (word: string) => {
    const key = normalizeTrapToken(word)
    if (!key || seen.has(key)) return
    seen.add(key)
    traps.push(word)
  }

  for (const token of tokens) {
    const normalized = normalizeTrapToken(token)
    if (normalized === 'an') add('a')
    if (normalized === 'a') add('an')
    if (normalized === 'a' || normalized === 'an') add('the')
  }

  return traps
}

function buildMorphTraps(tokens: string[], targetAnswer: string, lesson?: LessonData): string[][] {
  return tokens
    .map((token) => {
      const key = normalizeTrapToken(token)
      if (!key || FUNCTION_WORDS.has(key)) return []
      return morphVariantsForToken(token).filter((variant) => {
        const variantKey = normalizeTrapToken(variant)
        if (!variantKey || tokens.map(normalizeTrapToken).includes(variantKey)) return false
        return isWordBuilderTrapAllowed({
          trap: variant,
          correctTokens: tokens,
          targetAnswer,
          lesson,
        })
      })
    })
    .filter((variants) => variants.length > 0)
}

export function buildWordBuilderProExtraWords(
  targetAnswer: string,
  lesson?: LessonData
): string[] | undefined {
  const tokens = tokenizeAnswer(targetAnswer)
  const answerTokenKeys = new Set(tokens.map(normalizeTrapToken))
  const grammarTraps = buildGrammarTraps(tokens)
  const morphByToken = buildMorphTraps(tokens, targetAnswer, lesson)

  const extras: string[] = []
  const seen = new Set<string>()

  const addExtra = (word: string) => {
    const key = normalizeTrapToken(word)
    if (!key || answerTokenKeys.has(key) || seen.has(key)) return
    seen.add(key)
    extras.push(word)
  }

  for (const trap of grammarTraps) {
    addExtra(trap)
    if (extras.length >= 2) return extras
  }

  for (let round = 0; round < 6 && extras.length < 2; round += 1) {
    let added = false
    for (const variants of morphByToken) {
      const trap = variants[round]
      if (!trap) continue
      const before = extras.length
      addExtra(trap)
      if (extras.length > before) added = true
      if (extras.length >= 2) return extras
    }
    if (!added) break
  }

  return extras.length > 0 ? extras.slice(0, 2) : undefined
}
