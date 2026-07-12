import type { PracticeGenerationSource, PracticeMode, PracticeSession } from '@/types/practice'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeGlobalXpReason } from '@/lib/practice/practiceGlobalXpAward'
import { PRACTICE_RING_MAX } from '@/lib/practice/practiceEconomyRules'

export type PostPracticeActionId =
  | 'generate_variant'
  | 'upgrade_mode'
  | 'open_lesson'
  | 'open_tips'
  | 'other_topic'
  | 'ai_conversation'
  | 'menu'

export type PostPracticeCta = {
  id: PostPracticeActionId
  label: string
  hint?: string
  tone: 'primary' | 'secondary' | 'neutral'
}

export type PostPracticeRecommendation = {
  id: 'ai_conversation'
  label: string
} | null

export type ResolvePostPracticeActionsParams = {
  mode: PracticeMode
  generationSource: PracticeGenerationSource
  tier: PracticeEconomyTier
  globalAmount: number
  globalReason: PracticeGlobalXpReason | 'legacy_flat_30'
  ringCount: number
  ringIncremented: boolean
  canEarnRingToday: boolean
  cupClaimed: boolean
  cupAwarded: number
  masteryScore: number
  plannedLength: number
  hasLesson: boolean
  hasTips: boolean
  otherTopicAvailable: boolean
  chatAvailable?: boolean
}

export type ResolvePostPracticeActionsResult = {
  actions: PostPracticeCta[]
  recommendation: PostPracticeRecommendation
  nextMode: PracticeMode
}

function nextPracticeMode(mode: PracticeMode): PracticeMode {
  if (mode === 'reference') return 'challenge'
  if (mode === 'relaxed') return 'balanced'
  if (mode === 'balanced') return 'challenge'
  return 'challenge'
}

function generateLabel(generationSource: PracticeGenerationSource): string {
  return generationSource === 'ai_generated' ? 'Ещё раунд' : 'Ещё вариант'
}

function upgradeLabel(mode: PracticeMode): string {
  if (mode === 'reference') return 'К Челленджу'
  if (mode === 'relaxed') return 'К Обычной'
  if (mode === 'balanced') return 'К Челленджу'
  return 'Ещё раунд'
}

function pushUnique(
  list: PostPracticeCta[],
  item: PostPracticeCta | null,
  seen: Set<PostPracticeActionId>
) {
  if (!item || seen.has(item.id) || list.length >= 4) return
  seen.add(item.id)
  list.push(item)
}

function resolvePrimary(params: ResolvePostPracticeActionsParams): PostPracticeCta {
  const {
    mode,
    generationSource,
    tier,
    ringCount,
    canEarnRingToday,
    cupClaimed,
    masteryScore,
    plannedLength,
    hasLesson,
    otherTopicAvailable,
    globalReason,
  } = params

  const gen = (): PostPracticeCta => ({
    id: 'generate_variant',
    label: generateLabel(generationSource),
    tone: 'primary',
  })

  const nearMiss =
    mode === 'challenge' && masteryScore === 10 && plannedLength === 12 && canEarnRingToday

  if (
    mode === 'challenge' &&
    tier === 2 &&
    !cupClaimed &&
    ringCount < PRACTICE_RING_MAX &&
    canEarnRingToday
  ) {
    return {
      ...gen(),
      hint: `11/12 · ${Math.min(PRACTICE_RING_MAX, ringCount)}/${PRACTICE_RING_MAX}`,
    }
  }

  if (mode === 'challenge' && tier === 1 && ringCount < PRACTICE_RING_MAX && canEarnRingToday) {
    return {
      ...gen(),
      hint: `Зачёт ${Math.min(PRACTICE_RING_MAX, ringCount)}/${PRACTICE_RING_MAX}`,
    }
  }

  if (nearMiss) {
    return { ...gen(), hint: 'Нужна ещё 1' }
  }

  if (tier === 0 || masteryScore * 2 < plannedLength) {
    if (hasLesson) {
      return { id: 'open_lesson', label: 'Урок', tone: 'primary' }
    }
    return gen()
  }

  if (mode === 'relaxed' || mode === 'balanced') {
    return {
      id: 'upgrade_mode',
      label: upgradeLabel(mode),
      tone: 'primary',
    }
  }

  if (mode === 'reference') {
    return {
      id: 'upgrade_mode',
      label: upgradeLabel(mode),
      tone: 'primary',
    }
  }

  const ringBlocked = !canEarnRingToday || ringCount >= PRACTICE_RING_MAX || cupClaimed
  const xpDone = globalReason === 'daily_cap_reached'
  if (ringBlocked || xpDone || cupClaimed) {
    if (otherTopicAvailable) {
      return { id: 'other_topic', label: 'Другая', tone: 'primary' }
    }
    if (hasLesson) {
      return { id: 'open_lesson', label: 'Урок', tone: 'primary' }
    }
    return gen()
  }

  return gen()
}

function candidatePool(params: ResolvePostPracticeActionsParams): PostPracticeCta[] {
  const pool: PostPracticeCta[] = []
  pool.push({
    id: 'generate_variant',
    label: generateLabel(params.generationSource),
    tone: 'secondary',
  })
  if (params.mode === 'relaxed' || params.mode === 'balanced' || params.mode === 'reference') {
    pool.push({
      id: 'upgrade_mode',
      label: upgradeLabel(params.mode),
      tone: 'secondary',
    })
  }
  if (params.otherTopicAvailable) {
    pool.push({ id: 'other_topic', label: 'Другая', tone: 'secondary' })
  }
  if (params.hasLesson) {
    pool.push({ id: 'open_lesson', label: 'Урок', tone: 'neutral' })
  }
  if (params.hasTips) {
    pool.push({ id: 'open_tips', label: 'Фишки', tone: 'neutral' })
  }
  return pool
}

/**
 * Builds 2–4 unique CTAs for practice finale. Safe fallback always includes generate.
 */
export function resolvePostPracticeActions(
  params: ResolvePostPracticeActionsParams
): ResolvePostPracticeActionsResult {
  const seen = new Set<PostPracticeActionId>()
  const actions: PostPracticeCta[] = []
  const primary = resolvePrimary(params)
  pushUnique(actions, { ...primary, tone: 'primary' }, seen)

  const pool = candidatePool(params)
  const preferredSecondaryOrder: PostPracticeActionId[] = [
    'other_topic',
    'upgrade_mode',
    'open_lesson',
    'generate_variant',
  ]
  for (const id of preferredSecondaryOrder) {
    const item = pool.find((c) => c.id === id)
    if (!item) continue
    pushUnique(
      actions,
      {
        ...item,
        tone: actions.length === 1 ? 'secondary' : item.tone,
      },
      seen
    )
    if (actions.length >= 2) break
  }

  for (const id of ['open_tips', 'open_lesson', 'other_topic', 'generate_variant'] as const) {
    const item = pool.find((c) => c.id === id)
    if (!item) continue
    pushUnique(actions, { ...item, tone: 'neutral' }, seen)
  }

  if (actions.length === 0) {
    actions.push({
      id: 'generate_variant',
      label: generateLabel(params.generationSource),
      tone: 'primary',
    })
  }

  const recommendation: PostPracticeRecommendation =
    params.chatAvailable === false
      ? null
      : {
          id: 'ai_conversation',
          label: 'Рекомендую: Поговорить с ИИ по теме →',
        }

  return {
    actions: actions.slice(0, 4),
    recommendation,
    nextMode: nextPracticeMode(params.mode),
  }
}

export function resolveCanEarnRingToday(params: {
  tier: PracticeEconomyTier
  ringCount: number
  lastQualifyingDayKey?: string | null
  todayKey: string
}): boolean {
  if (params.tier <= 0) return false
  if (params.ringCount >= PRACTICE_RING_MAX) return false
  return (params.lastQualifyingDayKey ?? '') !== params.todayKey
}

export function sessionHasOpenableLesson(session: PracticeSession): boolean {
  if (session.source.kind === 'static_lesson') return Boolean(session.source.lessonId)
  return Boolean(session.source.lesson?.id)
}
