import type { PracticeMode } from '@/types/practice'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  BALANCED_BASE_MASTERY,
  CHALLENGE_QUALIFYING_MASTERY,
  CHALLENGE_SESSION_LENGTH,
} from '@/lib/practice/practiceEconomyRules'
import { getLessonTopicById } from '@/lib/lessonCatalog'

export type PracticeBadgeRank = 0 | 1 | 2 | 3

export type PracticeBadgeDefinition = {
  lessonId: string
  emoji: string
  ranks: [string, string, string]
}

/** 1 знак на урок × 3 имени ступеней (UX-канон). */
export const PRACTICE_BADGE_DEFINITIONS: PracticeBadgeDefinition[] = [
  {
    lessonId: '4',
    emoji: '👋',
    ranks: ['Начинающий собеседник', 'Мастер знакомств', 'Звезда знакомств'],
  },
  {
    lessonId: '1',
    emoji: '⏰',
    ranks: ['Наблюдатель', 'Мастер времени', 'Всегда вовремя'],
  },
  {
    lessonId: '2',
    emoji: '🕵️',
    ranks: ['Начинающий следователь', 'Мастер вопросов', 'Супер-следователь'],
  },
  {
    lessonId: '3',
    emoji: '🧩',
    ranks: ['Начинающий грамматик', 'Мастер придаточных', 'Я знаю, что говорю'],
  },
]

export const PRACTICE_BADGE_EASY_NORMAL_FOR_RANK2 = 5
export const PRACTICE_BADGE_RINGS_FOR_RANK2 = 3
export const PRACTICE_BADGE_RINGS_FOR_RANK3 = 5

/** Ранг practice-бейджа (не медаль урока 🥉🥈🥇). */
export const PRACTICE_BADGE_RANK_EMOJI = {
  1: '🔵',
  2: '⚪',
  3: '🟡',
} as const

export function practiceBadgeRankEmoji(rank: PracticeBadgeRank): string {
  if (rank < 1 || rank > 3) return '·'
  return PRACTICE_BADGE_RANK_EMOJI[rank as 1 | 2 | 3]
}

export function getPracticeBadgeDefinition(lessonId: string): PracticeBadgeDefinition | null {
  return PRACTICE_BADGE_DEFINITIONS.find((item) => item.lessonId === lessonId) ?? null
}

export function practiceBadgeRankName(
  definition: PracticeBadgeDefinition,
  rank: PracticeBadgeRank
): string | null {
  if (rank < 1 || rank > 3) return null
  return definition.ranks[rank - 1] ?? null
}

export function isStrongPracticePass(params: {
  mode: PracticeMode
  tier: PracticeEconomyTier
  masteryScore: number
  effectiveMasteryScore: number
  plannedLength: number
}): boolean {
  if (params.tier <= 0) return false
  if (params.mode === 'reference') return false
  const length = Math.max(1, Math.floor(params.plannedLength))
  const mastery = Math.max(0, Math.floor(params.masteryScore))
  const effective = Math.max(0, Math.floor(params.effectiveMasteryScore))

  if (params.mode === 'relaxed') {
    return mastery >= length
  }
  if (params.mode === 'balanced') {
    return length >= BALANCED_BASE_MASTERY && mastery >= BALANCED_BASE_MASTERY
  }
  if (params.mode === 'challenge') {
    const challengeLength = length >= CHALLENGE_QUALIFYING_MASTERY ? length : CHALLENGE_SESSION_LENGTH
    return effective >= CHALLENGE_QUALIFYING_MASTERY && challengeLength >= CHALLENGE_QUALIFYING_MASTERY
  }
  return false
}

export function isEasyNormalStrongPass(mode: PracticeMode): boolean {
  return mode === 'relaxed' || mode === 'balanced'
}

/** Миграция / догон ранга из уже известных счётчиков. */
export function resolvePracticeBadgeRankFromProgress(
  progress: Pick<
    PracticeTopicProgress,
    'badgeRank' | 'baseBadgeClaimedAt' | 'ringCount' | 'strongPassEasyNormalCount'
  >
): PracticeBadgeRank {
  let rank: PracticeBadgeRank = 0
  if (typeof progress.badgeRank === 'number' && progress.badgeRank >= 1 && progress.badgeRank <= 3) {
    rank = progress.badgeRank as PracticeBadgeRank
  }
  if (progress.baseBadgeClaimedAt) rank = Math.max(rank, 1) as PracticeBadgeRank
  if ((progress.strongPassEasyNormalCount ?? 0) >= 1 || (progress.ringCount ?? 0) >= 1) {
    rank = Math.max(rank, 1) as PracticeBadgeRank
  }
  if (
    (progress.strongPassEasyNormalCount ?? 0) >= PRACTICE_BADGE_EASY_NORMAL_FOR_RANK2 ||
    (progress.ringCount ?? 0) >= PRACTICE_BADGE_RINGS_FOR_RANK2
  ) {
    rank = Math.max(rank, 2) as PracticeBadgeRank
  }
  if ((progress.ringCount ?? 0) >= PRACTICE_BADGE_RINGS_FOR_RANK3) {
    rank = 3
  }
  return rank
}

export type PracticeBadgeAwardResult = {
  progress: PracticeTopicProgress
  previousRank: PracticeBadgeRank
  newRank: PracticeBadgeRank
  rankAwarded: PracticeBadgeRank | null
  strongPassThisRun: boolean
  easyNormalIncremented: boolean
}

export function applyPracticeBadgeProgressAfterCompletion(params: {
  progress: PracticeTopicProgress
  mode: PracticeMode
  tier: PracticeEconomyTier
  masteryScore: number
  effectiveMasteryScore: number
  plannedLength: number
}): PracticeBadgeAwardResult {
  const previousRank = resolvePracticeBadgeRankFromProgress(params.progress)
  const strongPassThisRun = isStrongPracticePass({
    mode: params.mode,
    tier: params.tier,
    masteryScore: params.masteryScore,
    effectiveMasteryScore: params.effectiveMasteryScore,
    plannedLength: params.plannedLength,
  })

  let strongPassEasyNormalCount = Math.max(0, params.progress.strongPassEasyNormalCount ?? 0)
  let easyNormalIncremented = false
  if (strongPassThisRun && isEasyNormalStrongPass(params.mode)) {
    strongPassEasyNormalCount += 1
    easyNormalIncremented = true
  }

  let progress: PracticeTopicProgress = {
    ...params.progress,
    strongPassEasyNormalCount,
  }

  // Rank 1 also from first strong pass this run (any eligible mode).
  if (strongPassThisRun && previousRank < 1) {
    progress = {
      ...progress,
      baseBadgeClaimedAt: progress.baseBadgeClaimedAt ?? Date.now(),
    }
  }

  const newRank = resolvePracticeBadgeRankFromProgress({
    ...progress,
    // Ensure ringCount from caller is used for rank 2/3.
    ringCount: progress.ringCount,
  })

  progress = {
    ...progress,
    badgeRank: newRank,
    ...(newRank >= 1 && !progress.baseBadgeClaimedAt
      ? { baseBadgeClaimedAt: Date.now() }
      : {}),
  }

  const rankAwarded: PracticeBadgeRank | null =
    newRank > previousRank ? newRank : null

  return {
    progress,
    previousRank,
    newRank,
    rankAwarded,
    strongPassThisRun,
    easyNormalIncremented,
  }
}

export type PracticeBadgeFinaleLineKind = 'awarded' | 'miss_threshold' | 'progress' | 'complete' | 'none'

export type PracticeBadgeFinaleLine = {
  kind: PracticeBadgeFinaleLineKind
  text: string
}

export function buildPracticeBadgeFinaleLine(params: {
  lessonId: string
  previousRank: PracticeBadgeRank
  newRank: PracticeBadgeRank
  rankAwarded: PracticeBadgeRank | null
  strongPassThisRun: boolean
  masteryScore: number
  plannedLength: number
  strongPassEasyNormalCount: number
  ringCount: number
  mode: PracticeMode
}): PracticeBadgeFinaleLine {
  const definition = getPracticeBadgeDefinition(params.lessonId)
  if (!definition) return { kind: 'none', text: '' }

  if (params.rankAwarded && params.rankAwarded >= 1) {
    const name = practiceBadgeRankName(definition, params.rankAwarded)
    if (name) {
      return {
        kind: 'awarded',
        text: `${practiceBadgeRankEmoji(params.rankAwarded)} ${name}!`,
      }
    }
  }

  if (params.newRank >= 3) {
    if (params.rankAwarded === 3) {
      const name = practiceBadgeRankName(definition, 3)
      return {
        kind: 'awarded',
        text: name ? `${practiceBadgeRankEmoji(3)} ${name}!` : '',
      }
    }
    return { kind: 'none', text: '' }
  }

  const nextRank = (Math.min(3, params.newRank + 1) || 1) as PracticeBadgeRank
  const nextName = practiceBadgeRankName(definition, nextRank) ?? 'бейдж'
  const nextEmoji = practiceBadgeRankEmoji(nextRank)
  const need = strongPassThresholdForMode(params.mode, params.plannedLength)

  if (!params.strongPassThisRun && params.newRank < 1 && need != null) {
    const short = Math.max(0, need - params.masteryScore)
    return {
      kind: 'miss_threshold',
      text: `До ${nextEmoji} «${nextName}» не хватило ${short} с первой (${params.masteryScore}/${params.plannedLength}).`,
    }
  }

  if (params.newRank < 1) {
    return {
      kind: 'progress',
      text: `До ${nextEmoji} «${nextName}» — 1 хороший проход.`,
    }
  }

  if (params.newRank === 1) {
    const viaEasy = params.strongPassEasyNormalCount
    const viaRings = params.ringCount
    if (viaRings >= PRACTICE_BADGE_RINGS_FOR_RANK2 || viaEasy >= PRACTICE_BADGE_EASY_NORMAL_FOR_RANK2) {
      return { kind: 'none', text: '' }
    }
    if (params.mode === 'challenge') {
      return {
        kind: 'progress',
        text: `До ${nextEmoji} «${nextName}»: 📝 ${viaRings}/${PRACTICE_BADGE_RINGS_FOR_RANK2}.`,
      }
    }
    return {
      kind: 'progress',
      text: `До ${nextEmoji} «${nextName}»: хороших ${viaEasy}/${PRACTICE_BADGE_EASY_NORMAL_FOR_RANK2}.`,
    }
  }

  // newRank === 2 → chase rank 3 via rings
  return {
    kind: 'progress',
    text: `До ${nextEmoji} «${nextName}»: 📝 ${params.ringCount}/${PRACTICE_BADGE_RINGS_FOR_RANK3}.`,
  }
}

function strongPassThresholdForMode(mode: PracticeMode, plannedLength: number): number | null {
  if (mode === 'relaxed') return Math.max(1, plannedLength)
  if (mode === 'balanced') return BALANCED_BASE_MASTERY
  if (mode === 'challenge') return CHALLENGE_QUALIFYING_MASTERY
  return null
}

export function buildPracticeBadgeBriefingLine(params: {
  lessonId: string
  progress: PracticeTopicProgress
}): string | null {
  const definition = getPracticeBadgeDefinition(params.lessonId)
  if (!definition) return null
  const rank = resolvePracticeBadgeRankFromProgress(params.progress)
  if (rank >= 3) {
    const name = practiceBadgeRankName(definition, 3)
    return name ? `Бейдж собран: ${practiceBadgeRankEmoji(3)} ${name}` : null
  }
  const nextRank = (rank + 1) as PracticeBadgeRank
  const name = practiceBadgeRankName(definition, nextRank)
  const nextEmoji = practiceBadgeRankEmoji(nextRank)
  if (!name) return null
  if (rank === 0) return `До ${nextEmoji} «${name}» — 1 хороший проход.`
  if (rank === 1) {
    const viaEasy = params.progress.strongPassEasyNormalCount ?? 0
    const viaRings = params.progress.ringCount ?? 0
    if (viaRings > 0) {
      return `До ${nextEmoji} «${name}»: 📝 ${viaRings}/${PRACTICE_BADGE_RINGS_FOR_RANK2} или хороших ${viaEasy}/${PRACTICE_BADGE_EASY_NORMAL_FOR_RANK2}.`
    }
    return `До ${nextEmoji} «${name}»: хороших ${viaEasy}/${PRACTICE_BADGE_EASY_NORMAL_FOR_RANK2}.`
  }
  return `До ${nextEmoji} «${name}»: 📝 ${params.progress.ringCount}/${PRACTICE_BADGE_RINGS_FOR_RANK3}.`
}

export function buildPracticeBadgeHeroLine(params: {
  lessonId: string
  progress: PracticeTopicProgress
}): string | null {
  return buildPracticeBadgeBriefingLine(params)
}

export type PracticeBadgeShelfItem = {
  lessonId: string
  emoji: string
  topicTitle: string
  rank: PracticeBadgeRank
  nextName: string | null
  currentName: string | null
}

export function listPracticeBadgeShelf(
  getProgress: (lessonId: string) => PracticeTopicProgress
): PracticeBadgeShelfItem[] {
  return PRACTICE_BADGE_DEFINITIONS.map((definition) => {
    const progress = getProgress(definition.lessonId)
    const rank = resolvePracticeBadgeRankFromProgress(progress)
    return {
      lessonId: definition.lessonId,
      emoji: definition.emoji,
      topicTitle: getLessonTopicById(definition.lessonId)?.title ?? `Урок ${definition.lessonId}`,
      rank,
      currentName: practiceBadgeRankName(definition, rank),
      nextName:
        rank >= 3 ? null : practiceBadgeRankName(definition, (rank + 1) as PracticeBadgeRank),
    }
  })
}

export function countPracticeBadgeStats(
  getProgress: (lessonId: string) => PracticeTopicProgress
): { opened: number; gold: number; total: number } {
  const items = listPracticeBadgeShelf(getProgress)
  return {
    opened: items.filter((item) => item.rank >= 1).length,
    gold: items.filter((item) => item.rank >= 3).length,
    total: items.length,
  }
}

export function pickNearestPracticeBadgeGoal(
  getProgress: (lessonId: string) => PracticeTopicProgress
): { lessonId: string; line: string; emoji: string } | null {
  for (const definition of PRACTICE_BADGE_DEFINITIONS) {
    const progress = getProgress(definition.lessonId)
    const rank = resolvePracticeBadgeRankFromProgress(progress)
    if (rank >= 3) continue
    const line = buildPracticeBadgeBriefingLine({ lessonId: definition.lessonId, progress })
    if (!line) continue
    return { lessonId: definition.lessonId, line, emoji: definition.emoji }
  }
  return null
}
