/**
 * Teacher any-tense: pre-pick current/next from CORE5∩CEFR without persisting concrete.
 */

import {
  pickAnyTenseForTurn,
  sanitizeUsedAnyTenses,
  type AnyDrillAxis,
} from '@/lib/anyTensePool'
import type { Audience, LevelId, SentenceType, TenseId } from '@/lib/types'
import type { EngvoCefrLevel } from '@/lib/engvo/constants'

export type TeacherAnyAxes = {
  current: TenseId
  next: TenseId
  usedTenses: TenseId[]
}

export function resolveTeacherAnyAxes(params: {
  level: EngvoCefrLevel | LevelId | string
  audience: Audience
  usedTensesRaw?: unknown
  currentTense?: TenseId | null
  seed: string
}): TeacherAnyAxes {
  const used = sanitizeUsedAnyTenses(params.usedTensesRaw)
  let current = params.currentTense
  let usedForNext = used

  if (!current || current === 'all') {
    const picked = pickAnyTenseForTurn({
      level: params.level,
      audience: params.audience,
      usedTenses: used,
      seed: `${params.seed}|teacher|cur`,
      excludeTense: null,
    })
    current = picked.tense
    usedForNext = used.includes(current) ? used : [...used, current]
  } else if (!usedForNext.includes(current)) {
    usedForNext = [...usedForNext, current]
  }

  const nextPick = pickAnyTenseForTurn({
    level: params.level,
    audience: params.audience,
    usedTenses: usedForNext,
    seed: `${params.seed}|teacher|next`,
    excludeTense: current,
  })

  return {
    current,
    next: nextPick.tense,
    usedTenses: usedForNext,
  }
}

/** Advance after a successful post-attempt drill commit. */
export function advanceTeacherAnyAxes(params: {
  level: EngvoCefrLevel | LevelId | string
  audience: Audience
  usedTenses: readonly string[]
  previousNext: TenseId
  seed: string
}): TeacherAnyAxes {
  const used = sanitizeUsedAnyTenses(params.usedTenses)
  const current = params.previousNext
  const usedForNext = used.includes(current) ? [...used] : [...used, current]
  const nextPick = pickAnyTenseForTurn({
    level: params.level,
    audience: params.audience,
    usedTenses: usedForNext,
    seed: `${params.seed}|teacher|adv`,
    excludeTense: current,
  })
  return {
    current,
    next: nextPick.tense,
    usedTenses: usedForNext,
  }
}

export type TeacherLiveAxisSnapshot = {
  current: AnyDrillAxis
  next: AnyDrillAxis
}

export function toTeacherLiveAxisSnapshot(params: {
  current: TenseId
  next: TenseId
  level: EngvoCefrLevel | LevelId
  sentenceType: SentenceType
}): TeacherLiveAxisSnapshot {
  const level = (params.level === 'all' ? 'a1' : params.level) as LevelId
  const sentenceType =
    params.sentenceType === 'mixed' ? 'general' : params.sentenceType
  return {
    current: {
      tense: params.current,
      effectiveLevel: level,
      effectiveSentenceType: sentenceType,
    },
    next: {
      tense: params.next,
      effectiveLevel: level,
      effectiveSentenceType: sentenceType,
    },
  }
}
