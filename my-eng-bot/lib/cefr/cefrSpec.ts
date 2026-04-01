import type { Audience, LevelId } from '@/lib/types'

export type SupportedCefrLevel = Exclude<LevelId, 'all'>

export interface CefrLevelSpec {
  id: SupportedCefrLevel
  maxSentenceWords: number
  maxTokenLength: number
  preferredLexicon: string
  grammarCeiling: string
}

const SPECS: Record<SupportedCefrLevel, CefrLevelSpec> = {
  starter: {
    id: 'starter',
    maxSentenceWords: 9,
    maxTokenLength: 9,
    preferredLexicon: 'very basic daily words, concrete nouns, frequent verbs',
    grammarCeiling: 'short simple clauses, one idea per sentence',
  },
  a1: {
    id: 'a1',
    maxSentenceWords: 11,
    maxTokenLength: 10,
    preferredLexicon: 'common everyday words for family, home, food, routine',
    grammarCeiling: 'short simple sentences, basic present forms',
  },
  a2: {
    id: 'a2',
    maxSentenceWords: 14,
    maxTokenLength: 11,
    preferredLexicon: 'everyday words plus simple descriptive vocabulary',
    grammarCeiling: 'simple connected sentences with basic connectors',
  },
  b1: {
    id: 'b1',
    maxSentenceWords: 18,
    maxTokenLength: 13,
    preferredLexicon: 'broader everyday words for reasons, opinions, experiences',
    grammarCeiling: 'clear natural patterns without heavy abstraction',
  },
  b2: {
    id: 'b2',
    maxSentenceWords: 24,
    maxTokenLength: 15,
    preferredLexicon: 'rich but common topic vocabulary',
    grammarCeiling: 'flexible natural structures without unnecessary complexity',
  },
  c1: {
    id: 'c1',
    maxSentenceWords: 30,
    maxTokenLength: 18,
    preferredLexicon: 'advanced precise vocabulary with context relevance',
    grammarCeiling: 'varied natural structures',
  },
  c2: {
    id: 'c2',
    maxSentenceWords: 36,
    maxTokenLength: 22,
    preferredLexicon: 'near-native precision, idiomatic vocabulary when appropriate',
    grammarCeiling: 'fully flexible natural structures',
  },
}

const LOW_LEVEL_DENY_WORDS = new Set([
  'synergy',
  'stakeholder',
  'leverage',
  'paradigm',
  'bandwidth',
  'deliverable',
  'roadmap',
  'quarterly',
  'monetization',
  'scalability',
  'procurement',
  'compliance',
  'jurisdiction',
  'consequently',
  'nevertheless',
  'notwithstanding',
  'aforementioned',
  'ubiquitous',
  'detrimental',
  'mitigate',
])

const CHILD_LOW_LEVEL_DENY_WORDS = new Set([
  'mortgage',
  'litigation',
  'shareholder',
  'portfolio',
  'derivative',
  'liability',
  'fiscal',
  'macroeconomic',
  'infrastructure',
  'jurisprudence',
])

export function getCefrSpec(level: LevelId): CefrLevelSpec | null {
  if (level === 'all') return null
  return SPECS[level] ?? SPECS.a1
}

export function getCefrDenyWords(params: { level: LevelId; audience: Audience }): Set<string> {
  if (params.level === 'all') return new Set()
  const isLowLevel = ['starter', 'a1', 'a2'].includes(params.level)
  if (!isLowLevel) return new Set()
  if (params.audience === 'child') {
    return new Set(Array.from(LOW_LEVEL_DENY_WORDS).concat(Array.from(CHILD_LOW_LEVEL_DENY_WORDS)))
  }
  return new Set(LOW_LEVEL_DENY_WORDS)
}

export function buildCefrPromptBlock(params: {
  level: LevelId
  audience: Audience
  mode: 'dialogue' | 'translation' | 'communication'
}): string {
  const spec = getCefrSpec(params.level)
  if (!spec) {
    return 'CEFR level mode is adaptive ("all"): mirror user complexity without jumping to advanced vocabulary unexpectedly.'
  }

  const deny = getCefrDenyWords({ level: params.level, audience: params.audience })
  const denyHint =
    deny.size > 0
      ? `Hard restriction: avoid business/academic advanced words such as ${Array.from(deny).slice(0, 8).join(', ')}.`
      : 'Avoid unnecessary complexity and rare words above this level.'

  return [
    `CEFR lexical ceiling (${spec.id.toUpperCase()}): keep output within this level limits.`,
    `Sentence length: usually <= ${spec.maxSentenceWords} words.`,
    `Word complexity: avoid long/rare words (rough cap ${spec.maxTokenLength} letters unless essential).`,
    `Preferred vocabulary: ${spec.preferredLexicon}.`,
    `Grammar ceiling: ${spec.grammarCeiling}.`,
    denyHint,
    params.mode === 'translation'
      ? 'For translation mode: keep Russian task sentence simple for the same CEFR level, and keep expected English answer within this CEFR level.'
      : 'If a word above level is unavoidable, use it minimally and immediately paraphrase with a simpler equivalent.',
  ].join(' ')
}
