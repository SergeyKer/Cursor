import type { Audience, LevelId } from '@/lib/types'
import { getCefrLevelConfig, type SupportedCefrLevel } from '@/lib/cefr/cefrConfig'

/**
 * Каноническая таблица уровней CEFR (все 15 колонок из инструкции) лежит в корне репозитория:
 * `CEFR_Levels.xlsx`, лист `Levels_Config`.
 */
export const CEFR_LEVELS_CONFIG_PROMPT_REF =
  'Authoritative full CEFR parameters per level (columns AllowedVocabulary, AvoidVocabulary, Grammar, etc.): project file CEFR_Levels.xlsx, sheet Levels_Config — use it as the single source of truth when generating or judging level-appropriate English.'

export interface CefrLevelSpec {
  id: SupportedCefrLevel
  maxSentenceWords: number
  maxTokenLength: number
  preferredLexicon: string
  grammarCeiling: string
}

const DEFAULT_SENTENCE_WORDS: Record<SupportedCefrLevel, number> = {
  starter: 9,
  a1: 11,
  a2: 14,
  b1: 18,
  b2: 24,
  c1: 30,
  c2: 36,
}

const DEFAULT_TOKEN_LENGTH: Record<SupportedCefrLevel, number> = {
  starter: 9,
  a1: 10,
  a2: 11,
  b1: 13,
  b2: 15,
  c1: 18,
  c2: 22,
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
  const config = getCefrLevelConfig(level)
  if (!config) return null
  return {
    id: config.level,
    maxSentenceWords: parseSentenceLengthLimit(config.sentenceLengthGuideline, config.level),
    maxTokenLength: DEFAULT_TOKEN_LENGTH[config.level] ?? DEFAULT_TOKEN_LENGTH.a1,
    preferredLexicon: config.allowedVocabulary,
    grammarCeiling: config.grammarKey,
  }
}

function parseSentenceLengthLimit(guideline: string, level: SupportedCefrLevel): number {
  const normalized = guideline.toLowerCase()
  const explicitNumber = normalized.match(/(\d{1,2})\s*(?:words?|слов)/i)
  if (explicitNumber) {
    const value = Number(explicitNumber[1])
    if (Number.isFinite(value) && value >= 4) return value
  }
  if (
    normalized.includes('1 idea') ||
    normalized.includes('одна идея') ||
    normalized.includes('1 идея') ||
    normalized.includes('короткие')
  ) {
    return DEFAULT_SENTENCE_WORDS[level]
  }
  if (normalized.includes('средняя') || normalized.includes('medium')) {
    return Math.max(DEFAULT_SENTENCE_WORDS[level], 16)
  }
  if (normalized.includes('гибк') || normalized.includes('flexible')) {
    return Math.max(DEFAULT_SENTENCE_WORDS[level], 24)
  }
  return DEFAULT_SENTENCE_WORDS[level]
}

function extractEnglishWords(text: string): string[] {
  return (text.match(/[a-z][a-z'-]{2,}/gi) ?? []).map((w) => w.toLowerCase())
}

export function getCefrDenyWords(params: { level: LevelId; audience: Audience }): Set<string> {
  if (params.level === 'all') return new Set()
  const config = getCefrLevelConfig(params.level)
  const denyFromConfig = new Set(
    extractEnglishWords(
      `${config?.forbiddenOrStrictlyLimited ?? ''}; ${config?.avoidVocabulary ?? ''}`
    )
  )
  const isLowLevel = ['starter', 'a1', 'a2'].includes(params.level)
  if (!isLowLevel) return denyFromConfig
  if (params.audience === 'child') {
    return new Set(
      Array.from(denyFromConfig)
        .concat(Array.from(LOW_LEVEL_DENY_WORDS))
        .concat(Array.from(CHILD_LOW_LEVEL_DENY_WORDS))
    )
  }
  return new Set(Array.from(denyFromConfig).concat(Array.from(LOW_LEVEL_DENY_WORDS)))
}

export function buildCefrPromptBlock(params: {
  level: LevelId
  audience: Audience
  mode: 'dialogue' | 'translation' | 'communication'
}): string {
  const spec = getCefrSpec(params.level)
  if (!spec) {
    return [
      'CEFR level mode is adaptive ("all"): mirror user complexity without jumping to advanced vocabulary unexpectedly.',
      CEFR_LEVELS_CONFIG_PROMPT_REF,
    ].join(' ')
  }

  const deny = getCefrDenyWords({ level: params.level, audience: params.audience })
  const denyHint =
    deny.size > 0
      ? `Hard restriction: avoid business/academic advanced words such as ${Array.from(deny).slice(0, 8).join(', ')}.`
      : 'Avoid unnecessary complexity and rare words above this level.'
  const config = getCefrLevelConfig(params.level)

  return [
    CEFR_LEVELS_CONFIG_PROMPT_REF,
    `CEFR lexical ceiling (${spec.id.toUpperCase()}): keep output within this level limits.`,
    `Sentence length: usually <= ${spec.maxSentenceWords} words.`,
    `Word complexity: avoid long/rare words (rough cap ${spec.maxTokenLength} letters unless essential).`,
    `Preferred vocabulary: ${config?.allowedVocabulary || spec.preferredLexicon}.`,
    `Avoid vocabulary: ${config?.avoidVocabulary || 'avoid words above learner level.'}.`,
    `Grammar ceiling: ${config?.grammarKey || spec.grammarCeiling}.`,
    `Question style: ${config?.questionStyle || 'natural, level-appropriate, concise.'}.`,
    `Correction priority: ${config?.correctionPriority || 'fix core meaning/grammar first, details second.'}.`,
    denyHint,
    params.mode === 'translation'
      ? 'For translation mode: keep Russian task sentence simple for the same CEFR level, and keep expected English answer within this CEFR level.'
      : 'If a word above level is unavoidable, use it minimally and immediately paraphrase with a simpler equivalent.',
  ].join(' ')
}
