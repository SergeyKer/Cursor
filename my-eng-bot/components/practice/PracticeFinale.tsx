'use client'

import { useMemo, useState } from 'react'
import FlowInfoCard from '@/components/FlowInfoCard'
import type { PracticeSession } from '@/types/practice'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { computePracticeMasterySnapshot } from '@/lib/practice/practiceMastery'
import { buildPracticeFinaleSummary } from '@/lib/practice/practiceFinaleCopy'
import type { PracticeGlobalXpReason } from '@/lib/practice/practiceGlobalXpAward'
import {
  POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS,
  POST_LESSON_NEUTRAL_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import {
  PRACTICE_FINALE_GRID_CLASS,
  PRACTICE_FINALE_MENU_LINK_CLASS,
  PRACTICE_FINALE_RECOMMEND_CLASS,
  PRACTICE_FINALE_STACK_CLASS,
} from '@/lib/practice/practiceFinaleLayout'
import {
  resolvePostPracticeActions,
  sessionHasOpenableLesson,
  type PostPracticeActionId,
  type PostPracticeCta,
} from '@/lib/practice/resolvePostPracticeActions'

export type PracticeFinaleActionHandler = (action: PostPracticeActionId) => void

interface PracticeFinaleProps {
  session: PracticeSession
  completionReady?: boolean
  tier?: PracticeEconomyTier
  globalAmount?: number
  globalReason?: PracticeGlobalXpReason | 'legacy_flat_30'
  ringCount?: number
  ringIncremented?: boolean
  canEarnRingToday?: boolean
  coinsAwarded?: number
  cupAwarded?: number
  pendingPracticeCoins?: number
  pendingCup?: boolean
  baseBadgeAwarded?: boolean
  baseBadgeClaimed?: boolean
  masteryScore?: number
  effectiveMasteryScore?: number
  correctedCount?: number
  plannedLength?: number
  forgivenessUsed?: boolean
  gemsPending?: boolean
  cupClaimed?: boolean
  hasTips?: boolean
  otherTopicAvailable?: boolean
  chatAvailable?: boolean
  /** Additive legacy handlers — still used as defaults. */
  onRepeat: () => void
  onChallenge: () => void
  onOpenLesson: () => void
  onBackToPracticeMenu: () => void
  onOpenTips?: () => void
  onOtherTopic?: () => void
  onOpenAiChat?: () => void
  onAction?: PracticeFinaleActionHandler
  busy?: boolean
}

function actionClass(tone: PostPracticeCta['tone'], spanFull: boolean): string {
  const base =
    tone === 'neutral' ? POST_LESSON_NEUTRAL_BUTTON_CLASS : POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS
  return spanFull ? `${base} col-span-2` : base
}

function PracticeFinaleSkeleton() {
  return (
    <div className={PRACTICE_FINALE_STACK_CLASS} aria-busy="true" aria-label="Загрузка результата">
      <div className="h-[110px] w-full animate-pulse rounded-2xl bg-[var(--chat-section-neutral)]" />
      <div className="mx-auto h-4 w-3/4 animate-pulse rounded bg-[var(--border)]/40" />
      <div className={PRACTICE_FINALE_GRID_CLASS}>
        <div className="h-11 animate-pulse rounded-xl bg-[var(--border)]/35" />
        <div className="h-11 animate-pulse rounded-xl bg-[var(--border)]/35" />
        <div className="h-11 animate-pulse rounded-xl bg-[var(--border)]/25" />
        <div className="h-11 animate-pulse rounded-xl bg-[var(--border)]/25" />
      </div>
      <div className="mx-auto h-4 w-24 animate-pulse rounded bg-[var(--border)]/30" />
    </div>
  )
}

export default function PracticeFinale({
  session,
  completionReady = true,
  tier = 0,
  globalAmount = 0,
  globalReason = 'no_eligible_award',
  ringCount = 0,
  ringIncremented = false,
  canEarnRingToday = false,
  coinsAwarded = 0,
  cupAwarded = 0,
  pendingPracticeCoins = 0,
  pendingCup = false,
  baseBadgeAwarded = false,
  baseBadgeClaimed = false,
  masteryScore,
  effectiveMasteryScore,
  correctedCount,
  plannedLength,
  forgivenessUsed = false,
  cupClaimed = false,
  hasTips = false,
  otherTopicAvailable = false,
  chatAvailable = true,
  onRepeat,
  onChallenge,
  onOpenLesson,
  onBackToPracticeMenu,
  onOpenTips,
  onOtherTopic,
  onOpenAiChat,
  onAction,
  busy = false,
}: PracticeFinaleProps) {
  const [pendingAction, setPendingAction] = useState<PostPracticeActionId | null>(null)
  const mastery = computePracticeMasterySnapshot(session)

  const resolved = useMemo(() => {
    if (!completionReady) return null
    return resolvePostPracticeActions({
      mode: session.mode,
      generationSource: session.generationSource ?? 'local',
      tier,
      globalAmount,
      globalReason,
      ringCount,
      ringIncremented,
      canEarnRingToday,
      cupClaimed,
      cupAwarded,
      masteryScore: masteryScore ?? mastery.masteryScore,
      plannedLength: plannedLength ?? mastery.plannedLength,
      hasLesson: sessionHasOpenableLesson(session),
      hasTips,
      otherTopicAvailable,
      chatAvailable,
    })
  }, [
    completionReady,
    session,
    tier,
    globalAmount,
    globalReason,
    ringCount,
    ringIncremented,
    canEarnRingToday,
    cupClaimed,
    cupAwarded,
    masteryScore,
    plannedLength,
    mastery.masteryScore,
    mastery.plannedLength,
    hasTips,
    otherTopicAvailable,
    chatAvailable,
  ])

  const summary = useMemo(() => {
    if (!completionReady) return null
    return buildPracticeFinaleSummary({
      mode: session.mode,
      masteryScore: masteryScore ?? mastery.masteryScore,
      effectiveMasteryScore: effectiveMasteryScore ?? mastery.masteryScore,
      correctedCount: correctedCount ?? mastery.correctedCount,
      plannedLength: plannedLength ?? mastery.plannedLength,
      sessionXp: session.xp,
      tier,
      globalAmount,
      globalReason,
      ringCount,
      ringIncremented,
      coinsAwarded,
      cupAwarded,
      pendingPracticeCoins,
      pendingCup,
      baseBadgeAwarded,
      baseBadgeClaimed,
      forgivenessUsed,
    })
  }, [
    completionReady,
    session.mode,
    session.xp,
    masteryScore,
    effectiveMasteryScore,
    correctedCount,
    plannedLength,
    mastery,
    tier,
    globalAmount,
    globalReason,
    ringCount,
    ringIncremented,
    coinsAwarded,
    cupAwarded,
    pendingPracticeCoins,
    pendingCup,
    baseBadgeAwarded,
    baseBadgeClaimed,
    forgivenessUsed,
  ])

  if (!completionReady || !resolved || !summary) {
    return <PracticeFinaleSkeleton />
  }

  const actions = resolved.actions
  const locked = busy || pendingAction !== null

  const dispatch = (action: PostPracticeActionId) => {
    if (locked) return
    setPendingAction(action)
    if (onAction) {
      onAction(action)
      return
    }
    if (action === 'generate_variant') onRepeat()
    else if (action === 'upgrade_mode') onChallenge()
    else if (action === 'open_lesson') onOpenLesson()
    else if (action === 'open_tips') (onOpenTips ?? onOpenLesson)()
    else if (action === 'other_topic') (onOtherTopic ?? onRepeat)()
    else if (action === 'ai_conversation') (onOpenAiChat ?? onBackToPracticeMenu)()
    else onBackToPracticeMenu()
  }

  const busyLabel =
    pendingAction === 'generate_variant' || busy
      ? 'Готовим следующий раунд…'
      : 'Открываем…'

  return (
    <div
      className={PRACTICE_FINALE_STACK_CLASS}
      role="region"
      aria-label="Результат практики"
    >
      <div className="animate-fade-in-up w-full">
        <FlowInfoCard
          variant={summary.variant}
          title={summary.title}
          firstTryLine={summary.statsLine}
          statsLine={summary.starsLine}
          coinLine={summary.specialLine ?? summary.levelLine}
        />
      </div>

      {resolved.recommendation ? (
        <button
          type="button"
          disabled={locked}
          onClick={() => dispatch('ai_conversation')}
          className={`${PRACTICE_FINALE_RECOMMEND_CLASS} disabled:opacity-60`}
        >
          <span className="text-[var(--accent)] underline-offset-2 hover:underline">
            {resolved.recommendation.label}
          </span>
        </button>
      ) : null}

      <div className={PRACTICE_FINALE_GRID_CLASS}>
        {actions.map((action, index) => {
          const spanFull = actions.length === 3 && index === 2
          const isPrimary = action.tone === 'primary'
          return (
            <div
              key={action.id}
              className={`animate-fade-in-up ${spanFull ? 'col-span-2' : ''}`}
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
            >
              <button
                type="button"
                disabled={locked}
                onClick={() => dispatch(action.id)}
                className={actionClass(action.tone, false)}
              >
                <span className="min-w-0 flex flex-col items-center leading-tight">
                  <span>
                    {locked && isPrimary ? busyLabel : action.label}
                  </span>
                  {isPrimary && action.hint && !locked ? (
                    <span className="text-[9px] leading-tight text-white/90 sm:text-[10px]">
                      {action.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        disabled={locked}
        onClick={() => dispatch('menu')}
        className={PRACTICE_FINALE_MENU_LINK_CLASS}
      >
        В меню практики
      </button>
    </div>
  )
}
