/**
 * Current/next drill axis для translation tense=`all`.
 */

import {
  type AnyDrillAxis,
  pickAnyTenseForTurn,
  sanitizeUsedAnyTenses,
  validateAnyDrillAxis,
} from '@/lib/anyTensePool'
import type { Audience, LevelId, SentenceType, TenseId } from '@/lib/types'

const MIXED_CYCLE: SentenceType[] = ['general', 'interrogative', 'negative']

export type TranslationAnyAxesResult = {
  current: AnyDrillAxis
  next: AnyDrillAxis
  usedTenses: TenseId[]
  phase: 'core' | 'full'
}

function pickEffectiveLevel(params: {
  menuLevel: LevelId | string
  dialogSeed: string
  drillIndex: number
  topic: string
  pickTranslationEffectiveLevel: (p: {
    storedLevel: string
    dialogSeed: string
    drillIndex: number
    topic: string
  }) => string
}): LevelId {
  if (params.menuLevel === 'all') {
    return params.pickTranslationEffectiveLevel({
      storedLevel: String(params.menuLevel),
      dialogSeed: params.dialogSeed,
      drillIndex: params.drillIndex,
      topic: params.topic,
    }) as LevelId
  }
  return params.menuLevel as LevelId
}

function pickEffectiveSentenceType(params: {
  menuSentenceType: SentenceType
  dialogSeed: string
  drillIndex: number
  topic: string
  tense: string
  stableHash32: (s: string) => number
}): SentenceType {
  if (params.menuSentenceType !== 'mixed') return params.menuSentenceType
  const h = params.stableHash32(
    `${params.dialogSeed}|tstp|${params.drillIndex}|${params.topic}|${params.tense}`
  )
  return MIXED_CYCLE[h % MIXED_CYCLE.length] ?? 'general'
}

export function resolveTranslationAnyAxes(params: {
  audience: Audience
  menuLevel: LevelId | string
  menuSentenceType: SentenceType
  dialogSeed: string
  /** Index for NEXT axis seed (usually assistant count). */
  drillIndex: number
  topic: string
  usedTensesRaw: unknown
  currentAxisRaw: unknown
  pickTranslationEffectiveLevel: (p: {
    storedLevel: string
    dialogSeed: string
    drillIndex: number
    topic: string
  }) => string
  stableHash32: (s: string) => number
}): TranslationAnyAxesResult {
  const usedTenses = sanitizeUsedAnyTenses(params.usedTensesRaw)
  const validated = validateAnyDrillAxis(params.currentAxisRaw, {
    audience: params.audience,
    menuLevel: params.menuLevel,
    menuSentenceType: params.menuSentenceType,
  })

  let current: AnyDrillAxis
  let usedForNext = usedTenses

  if (validated) {
    current = validated
    if (!usedForNext.includes(current.tense)) {
      usedForNext = [...usedForNext, current.tense]
    }
  } else {
    const levelForCurrent = pickEffectiveLevel({
      menuLevel: params.menuLevel,
      dialogSeed: params.dialogSeed,
      drillIndex: Math.max(0, params.drillIndex - 1),
      topic: params.topic,
      pickTranslationEffectiveLevel: params.pickTranslationEffectiveLevel,
    })
    const picked = pickAnyTenseForTurn({
      level: levelForCurrent,
      audience: params.audience,
      usedTenses,
      seed: `${params.dialogSeed}|trt|cur|${params.drillIndex}|${params.topic}`,
      excludeTense: null,
    })
    const sentenceType = pickEffectiveSentenceType({
      menuSentenceType: params.menuSentenceType,
      dialogSeed: params.dialogSeed,
      drillIndex: Math.max(0, params.drillIndex - 1),
      topic: params.topic,
      tense: picked.tense,
      stableHash32: params.stableHash32,
    })
    current = {
      tense: picked.tense,
      effectiveLevel: levelForCurrent === 'all' ? 'a1' : levelForCurrent,
      effectiveSentenceType: sentenceType,
    }
    usedForNext = usedTenses.includes(current.tense) ? usedTenses : [...usedTenses, current.tense]
  }

  const levelForNext = pickEffectiveLevel({
    menuLevel: params.menuLevel,
    dialogSeed: params.dialogSeed,
    drillIndex: params.drillIndex,
    topic: params.topic,
    pickTranslationEffectiveLevel: params.pickTranslationEffectiveLevel,
  })
  const nextPick = pickAnyTenseForTurn({
    level: levelForNext,
    audience: params.audience,
    usedTenses: usedForNext,
    seed: `${params.dialogSeed}|trt|next|${params.drillIndex}|${params.topic}`,
    excludeTense: current.tense,
  })
  const nextSentenceType = pickEffectiveSentenceType({
    menuSentenceType: params.menuSentenceType,
    dialogSeed: params.dialogSeed,
    drillIndex: params.drillIndex,
    topic: params.topic,
    tense: nextPick.tense,
    stableHash32: params.stableHash32,
  })
  const next: AnyDrillAxis = {
    tense: nextPick.tense,
    effectiveLevel: levelForNext === 'all' ? 'a1' : levelForNext,
    effectiveSentenceType: nextSentenceType,
  }

  return {
    current,
    next,
    usedTenses: usedForNext,
    phase: nextPick.phase,
  }
}

/** Extra system rules so ERROR blocks stay on current and SUCCESS next uses nextAxis. */
export function buildTranslationAnyAxisPromptRules(params: {
  current: AnyDrillAxis
  next: AnyDrillAxis
  tenseLabel: (id: string) => string
}): string {
  const curT = params.tenseLabel(params.current.tense)
  const nextT = params.tenseLabel(params.next.tense)
  return [
    '\n\nANY-TENSE DRILL AXIS (strict):',
    `Current drill axis (ERROR / Скажи / grading / Комментарий about the learner answer): Required tense=${curT}; CEFR=${params.current.effectiveLevel}; sentence type=${params.current.effectiveSentenceType}.`,
    `Next drill axis (SUCCESS only — Переведи далее + __TRAN_REPEAT_REF__ for that next RU): Required tense=${nextT}; CEFR=${params.next.effectiveLevel}; sentence type=${params.next.effectiveSentenceType}.`,
    'ERROR path: use ONLY the current drill axis. Do NOT output Переведи далее. Скажи and __TRAN_REPEAT_REF__ must match the current Russian task only; never use the next-axis tense on ERROR.',
    'SUCCESS path only: Комментарий is about the current answer (may name the current tense); Переведи далее and its __TRAN_REPEAT_REF__ MUST follow the next drill axis; never emit next-axis material on ERROR.',
  ].join(' ')
}

export function detectTranslationAdvancedToNextDrill(content: string): boolean {
  const text = content.trim()
  if (!text) return false
  if (/(^|\n)\s*Скажи\s*:/i.test(text)) return false
  if (/(^|\n)\s*Комментарий_перевод\s*:/i.test(text)) return false
  if (/(^|\n)\s*Ошибки\s*:/i.test(text)) return false
  return /(^|\n)\s*Переведи\s+далее\s*:/i.test(text)
}
