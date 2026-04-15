import type { Audience, LevelId } from '@/lib/types'
import { getCefrDenyWords, getCefrSpec } from '@/lib/cefr/cefrSpec'

type GuardMode = 'dialogue' | 'translation' | 'communication'

const SIMPLE_REPLACEMENTS: Record<string, string> = {
  additionally: 'also',
  approximately: 'about',
  consequently: 'so',
  nevertheless: 'but',
  facilitate: 'help',
  utilize: 'use',
  acquire: 'get',
  numerous: 'many',
  commence: 'start',
  conclude: 'finish',
  discuss: 'talk about',
  explore: 'look at',
  clarify: 'explain',
  interests: 'likes',
}
const SIMPLIFIABLE_WORDS = new Set(Object.keys(SIMPLE_REPLACEMENTS))

export interface CefrGuardResult {
  content: string
  leaked: boolean
  violations: string[]
}

function extractEnglishTokens(text: string): string[] {
  return (text.match(/\b[a-z][a-z'-]*\b/gi) ?? []).map((t) => t.toLowerCase())
}

function splitSentenceWords(text: string): string[][] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences.map((s) => extractEnglishTokens(s))
}

function detectEnglishViolations(params: {
  text: string
  level: LevelId
  audience: Audience
}): string[] {
  const spec = getCefrSpec(params.level)
  if (!spec) return []

  const violations: string[] = []
  const deny = getCefrDenyWords({ level: params.level, audience: params.audience })
  const isLowLevel = ['starter', 'a1', 'a2'].includes(params.level)
  const tokens = extractEnglishTokens(params.text)

  for (const token of tokens) {
    if (deny.has(token)) {
      violations.push(`denied:${token}`)
      continue
    }
    if (isLowLevel && SIMPLIFIABLE_WORDS.has(token)) {
      violations.push(`simplify:${token}`)
      continue
    }
    if (token.length > spec.maxTokenLength) {
      violations.push(`long:${token}`)
    }
  }

  const sentenceWords = splitSentenceWords(params.text)
  for (const words of sentenceWords) {
    if (words.length > spec.maxSentenceWords + 4) {
      violations.push(`sentence_len:${words.length}`)
    }
  }

  return violations
}

function simplifyEnglishText(text: string): string {
  let next = text
  for (const [hard, easy] of Object.entries(SIMPLE_REPLACEMENTS)) {
    const re = new RegExp(`\\b${hard}\\b`, 'gi')
    next = next.replace(re, easy)
  }
  next = next.replace(/\s{2,}/g, ' ').trim()
  return next
}

/** Дробим по концам предложений, чтобы длинный абзац без \\n не резался целиком до одного короткого фрагмента. */
function splitRoughEnglishSentences(segment: string): string[] {
  const trimmed = segment.trim()
  if (!trimmed) return []
  const parts = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [trimmed]
}

function trimSingleEnglishClause(clause: string, maxWords: number): string {
  if (!/[A-Za-z]/.test(clause)) return clause
  const words = clause.split(/\s+/)
  if (words.length <= maxWords) return clause
  const keep = words.slice(0, maxWords).join(' ')
  return keep.replace(/[,;:]\s*$/, '').trim()
}

function trimLongEnglishSentences(params: { text: string; level: LevelId }): string {
  const spec = getCefrSpec(params.level)
  if (!spec) return params.text

  const maxWords = spec.maxSentenceWords + 4

  return params.text
    .split('\n')
    .map((line) => {
      if (!/[A-Za-z]/.test(line)) return line
      const sentences = splitRoughEnglishSentences(line)
      return sentences.map((s) => trimSingleEnglishClause(s, maxWords)).join(' ')
    })
    .join('\n')
}

function simplifyDialogueOrTranslationContent(params: {
  content: string
  level: LevelId
}): string {
  const lines = params.content.split('\n')
  const transformed = lines.map((line) => {
    if (/^\s*Скажи\s*:/i.test(line)) {
      const [prefix, rest = ''] = line.split(/:\s*/, 2)
      const simplified = trimLongEnglishSentences({
        text: simplifyEnglishText(rest),
        level: params.level,
      })
      return `${prefix}: ${simplified}`.trim()
    }
    if (/^\s*Комментарий\s*:/i.test(line)) return line
    if (!/[A-Za-z]/.test(line)) return line
    if (/\?\s*$/.test(line) || /^[A-Za-z].*[.!?]?$/.test(line.trim())) {
      return trimLongEnglishSentences({
        text: simplifyEnglishText(line),
        level: params.level,
      })
    }
    return line
  })
  return transformed.join('\n').trim()
}

export function applyCefrOutputGuard(params: {
  mode: GuardMode
  content: string
  level: LevelId
  audience: Audience
  communicationTargetLang?: 'ru' | 'en'
}): CefrGuardResult {
  if (params.level === 'all') {
    return { content: params.content, leaked: false, violations: [] }
  }

  const shouldGuardEnglish =
    params.mode !== 'communication' || params.communicationTargetLang === 'en'
  if (!shouldGuardEnglish) {
    return { content: params.content, leaked: false, violations: [] }
  }

  const firstViolations = detectEnglishViolations({
    text: params.content,
    level: params.level,
    audience: params.audience,
  })
  if (firstViolations.length === 0) {
    return { content: params.content, leaked: false, violations: [] }
  }

  const rewritten =
    params.mode === 'communication'
      ? trimLongEnglishSentences({
          text: simplifyEnglishText(params.content),
          level: params.level,
        })
      : simplifyDialogueOrTranslationContent({
          content: params.content,
          level: params.level,
        })

  const secondViolations = detectEnglishViolations({
    text: rewritten,
    level: params.level,
    audience: params.audience,
  })

  return {
    content: rewritten,
    leaked: secondViolations.length > 0,
    violations: secondViolations.length > 0 ? secondViolations : firstViolations,
  }
}
