'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import {
  BTN_DISABLED_CLASS,
  BTN_FONT_INLINE,
  BTN_INTERACTION_BASE,
  CARD_LAUNCH_SKIN,
} from '@/lib/homeCtaStyles'
import { trackProgressEvent } from '@/lib/progress/analytics'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import { toggleTopicAwardExpanded } from '@/lib/progress/topicAwardRows'
import ProgressTopicAwardsList from '@/components/progress/ProgressTopicAwardsList'
import type { RewardsState } from '@/lib/rewardsState'
import type { Settings, UsageInfo } from '@/lib/types'
import {
  progressCopy,
  type ProgressAudience,
} from '@/lib/uiCopy/progress'
import { ruDayWord } from '@/lib/uiCopy/myPlan'

export interface ProgressPanelProps {
  rewardsState: RewardsState | undefined
  settings: Settings
  usage: UsageInfo
  dialogueCorrectAnswers: number
  onMenuViewChange: (view: 'myPlan') => void
}

const STATUS_TILE_CLASS =
  'chat-section-surface glass-surface min-w-0 overflow-hidden rounded-[var(--bubble-radius-assistant,1rem)] border border-[var(--chat-section-neutral-border)] bg-white px-3 py-2.5'

const STATUS_WIDE_TILE_CLASS = `${STATUS_TILE_CLASS} !py-3.5`

/** Streak CTA inset matches composer dock: px-2.5 sm:px-3, bottom 0.625rem. */
const STATUS_STREAK_TILE_CLASS = `${STATUS_TILE_CLASS} !px-2.5 !pt-3.5 !pb-2.5 sm:!px-3`

/** Level bar card: bottom inset slightly below gap above XP line (`mt-1.5`). */
const STATUS_LEVEL_TILE_CLASS = `${STATUS_TILE_CLASS} !pt-3.5 !pb-2`

const STATUS_INSET_LAUNCH_BTN = [
  BTN_INTERACTION_BASE,
  CARD_LAUNCH_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'mt-3 flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center',
].join(' ')

export default function ProgressPanel({
  rewardsState,
  settings,
  usage,
  dialogueCorrectAnswers,
  onMenuViewChange,
}: ProgressPanelProps) {
  const audience: ProgressAudience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = progressCopy(audience)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [streakOpen, setStreakOpen] = useState(false)
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
  const [shelfTracked, setShelfTracked] = useState(false)

  const shelf = useMemo(() => buildProgressShelf(rewardsState), [rewardsState])
  const status = useMemo(
    () =>
      buildProgressStatusCopy({
        rewardsState,
        copy,
        audience,
        cupsEnabled: shelf.cupsEnabled,
        opportunity: shelf.opportunity,
      }),
    [rewardsState, copy, audience, shelf.cupsEnabled, shelf.opportunity]
  )

  useEffect(() => {
    trackProgressEvent('progress_viewed', { audience })
    if (audience === 'adult') {
      trackProgressEvent('progress_premium_cue_shown', { audience })
    }
  }, [audience])

  const openShelf = () => {
    setShelfOpen(true)
    if (!shelfTracked) {
      trackProgressEvent('progress_shelf_opened', { audience })
      setShelfTracked(true)
    }
  }

  const goMyPlan = () => {
    trackProgressEvent('progress_to_my_plan_click', { audience })
    onMenuViewChange('myPlan')
  }

  const saveStreak = () => {
    trackProgressEvent('progress_streak_save_click', { audience })
    onMenuViewChange('myPlan')
  }

  const xpPercent =
    shelf.xpToNextLevel > 0
      ? Math.min(100, Math.round((shelf.currentLevelXP / shelf.xpToNextLevel) * 100))
      : 0

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className={`${STATUS_TILE_CLASS} text-center`}>
            <p className="emoji-line text-[22px] leading-none">{DAILY_STREAK_GLYPH}</p>
            <p className="mt-0.5 text-[19px] font-semibold tabular-nums text-[var(--text)]">
              {shelf.dailyStreak}
            </p>
            <p className="text-[13px] text-[var(--text-muted)]">{copy.streakShort}</p>
          </div>
          <div className={`${STATUS_TILE_CLASS} text-center`}>
            <p className="emoji-line text-[22px] leading-none">⭐</p>
            <p className="mt-0.5 text-[19px] font-semibold tabular-nums text-[var(--text)]">
              {shelf.totalXP}
            </p>
            <p className="text-[13px] text-[var(--text-muted)]">{copy.xpShort}</p>
          </div>
          <div className={`${STATUS_TILE_CLASS} text-center`}>
            <p className="emoji-line text-[22px] leading-none">👑</p>
            <p className="mt-0.5 text-[19px] font-semibold tabular-nums text-[var(--text)]">
              {shelf.level}
            </p>
            <p className="text-[13px] text-[var(--text-muted)]">{copy.levelShort}</p>
          </div>
        </div>
        <div className={STATUS_LEVEL_TILE_CLASS}>
          <p className="flex items-center justify-center gap-1.5 text-center text-[15px] font-semibold leading-none text-[var(--text)]">
            <span
              className="inline-flex h-[1em] w-[1em] shrink-0 -translate-y-[3px] items-center justify-center text-[16px] leading-none"
              aria-hidden
            >
              👑
            </span>
            <span className="leading-none">{copy.levelShort}</span>
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <span className="inline-flex h-3.5 w-7 shrink-0 -translate-y-px items-center justify-center text-[17px] font-bold tabular-nums leading-none text-[var(--text)]">
              {shelf.level}
            </span>
            <div className="ui-progress-track h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent)_28%,white)]">
              <div
                className="ui-progress-fill h-full rounded-full transition-[width] duration-300"
                style={{ width: `${xpPercent}%` }}
                role="progressbar"
                aria-valuenow={shelf.currentLevelXP}
                aria-valuemin={0}
                aria-valuemax={shelf.xpToNextLevel}
                aria-label={`${copy.currentLevelLabel} ${shelf.level}, ${shelf.currentLevelXP}/${shelf.xpToNextLevel} XP`}
              />
            </div>
            <span className="inline-flex h-3.5 w-7 shrink-0 -translate-y-px items-center justify-center text-[17px] font-bold tabular-nums leading-none text-[var(--text)]">
              {shelf.level + 1}
            </span>
          </div>
          <p className="mt-1.5 text-center text-[15px] font-semibold tabular-nums text-[var(--text)]">
            {shelf.currentLevelXP}/{shelf.xpToNextLevel} XP
          </p>
        </div>
        <div className={STATUS_STREAK_TILE_CLASS}>
          <div className="min-w-0">
            <p className="flex items-center gap-2.5 text-[17px] font-semibold leading-snug text-[var(--text)]">
              <span className="emoji-line shrink-0 text-[20px] leading-none">{DAILY_STREAK_GLYPH}</span>
              <span className="min-w-0">{status.streakStatusHeadline}</span>
            </p>
            {status.streakStatusBody ? (
              <p className="mt-2 text-[15px] leading-snug text-[var(--text)]">{status.streakStatusBody}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="mt-2 min-h-[44px] w-full rounded-md px-1 text-left text-[12px] font-medium text-[var(--accent)]"
            aria-expanded={streakOpen}
            onClick={() => setStreakOpen((v) => !v)}
          >
            {streakOpen ? copy.streakHide : copy.streakMore}
          </button>
          {streakOpen ? (
            <div className="mt-1 space-y-1 text-[12px] text-[var(--text-muted)]">
              <p>
                {copy.recordLabel}: {shelf.bestDailyStreak} {ruDayWord(shelf.bestDailyStreak)}
              </p>
              {shelf.streakCopy.bonusTodayLabel ? (
                <p>
                  {audience === 'child' ? 'Бонус сегодня: ' : 'Бонус за первый шаг сегодня: '}
                  {shelf.streakCopy.bonusTodayLabel}
                </p>
              ) : null}
              {shelf.streakCopy.introLine ? <p>{shelf.streakCopy.introLine}</p> : null}
              <p>{shelf.streakCopy.statusLine}</p>
              {shelf.streakCopy.nextThresholdLine ? (
                <p>{shelf.streakCopy.nextThresholdLine}</p>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className={STATUS_INSET_LAUNCH_BTN}
            aria-label={`${status.streakCtaLabel} — открыть Мой план`}
            onClick={saveStreak}
          >
            <span className="min-w-0 break-words">{status.streakCtaLabel}</span>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">{copy.awardsTitle}</p>
        {shelf.isEmptyShelf ? (
          <>
            <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">{copy.emptyTitle}</p>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">{copy.emptyBody}</p>
          </>
        ) : (
          <p className="emoji-line mt-1 text-[14px] font-semibold text-[var(--text)]">
            🥇 {shelf.medals.gold} · 🥈 {shelf.medals.silver} · 🥉 {shelf.medals.bronze}
            {shelf.cupStats ? ` · 🏆 ${shelf.cupStats.cups}` : ''}
            {` · ${copy.lessonBadgesSummary} ${shelf.lessonBadgesEarned}`}
          </p>
        )}
        <button
          type="button"
          className="mt-2 min-h-[44px] w-full rounded-md border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-left text-[13px] font-medium text-[var(--text)]"
          aria-expanded={shelfOpen}
          onClick={() => {
            if (shelfOpen) {
              setShelfOpen(false)
              setExpandedLessonId(null)
            } else {
              openShelf()
            }
          }}
        >
          {shelfOpen ? copy.hideShelf : copy.showShelf}
        </button>
        {shelfOpen ? (
          <div className="mt-3">
            {shelf.cupStats ? (
              <p className="emoji-line mb-2 text-[13px] text-[var(--text-muted)]">
                🏆 {shelf.cupStats.cups}/{shelf.cupStats.withMedal || 0}
              </p>
            ) : null}
            <ProgressTopicAwardsList
              rows={shelf.topicAwardRows}
              copy={copy}
              expandedLessonId={expandedLessonId}
              nearestBadge={shelf.nearestBadge}
              onToggle={(lessonId) =>
                setExpandedLessonId((cur) => toggleTopicAwardExpanded(cur, lessonId))
              }
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">{copy.todayTitle}</p>
        {status.modeGoals.map((goal) => (
          <div
            key={goal.mode}
            className="mt-1 rounded-md border border-[var(--border)]/70 bg-[var(--menu-control-bg)] px-2.5 py-2"
          >
            <p className="text-[13px] text-[var(--text)]">{goal.line}</p>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              {goal.statusLabel}
              {goal.assigned && audience === 'adult' ? ' · Задание' : ''}
              {goal.estimatedDurationMinutes && audience === 'adult'
                ? ` · ~${goal.estimatedDurationMinutes} мин`
                : ''}
            </p>
          </div>
        ))}
        {status.focusGoal && status.focusGoal.goalTarget > 0 ? (
          <div className="mt-2">
            <div className="ui-progress-track h-2 overflow-hidden rounded-full bg-[var(--menu-control-bg)]">
              <div
                className="ui-progress-fill h-full rounded-full transition-[width] duration-300"
                style={{ width: `${status.focusPercent}%` }}
                role="progressbar"
                aria-valuenow={status.focusGoal.goalProgress}
                aria-valuemin={0}
                aria-valuemax={status.focusGoal.goalTarget}
                aria-label={`${status.focusGoal.label}: ${status.focusGoal.goalProgress} из ${status.focusGoal.goalTarget}`}
              />
            </div>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              {status.focusGoal.label}: {status.focusGoal.goalProgress}/
              {status.focusGoal.goalTarget}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">{copy.balanceTitle}</p>
        <p className="emoji-line mt-1 text-[14px] text-[var(--text)]">
          🪙 {shelf.currencies.coins} {copy.coinsLabel} · 💎 {shelf.currencies.gems}{' '}
          {copy.gemsLabel} · 🎫 {shelf.currencies.tickets} {copy.ticketsLabel}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">{copy.aiTitle}</p>
        <p className="mt-1 text-[13px] text-[var(--text)]">
          {copy.dialogueCorrect}: {dialogueCorrectAnswers}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--text)]">
          {copy.usageLabel}:{' '}
          {audience === 'child'
            ? usage.used
            : usage.limit > 0
              ? `${usage.used} / ${usage.limit}`
              : `${usage.used}`}
        </p>
        {audience === 'adult' ? (
          <p className="mt-2 text-[12px] leading-snug text-[var(--text-muted)]">{copy.premiumCue}</p>
        ) : (
          <p className="mt-2 text-[12px] leading-snug text-[var(--text-muted)]">{copy.premiumCue}</p>
        )}
      </div>

      {status.opportunity ? (
        <div className="rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-3">
          <p className="text-[13px] font-medium text-[var(--status-info-text)]">
            {status.opportunity.frame}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">
            {status.opportunity.title}
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            {status.opportunity.reasonLine}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5 text-left text-[14px] font-medium text-[var(--text)]"
        aria-label={copy.toMyPlanAria}
        onClick={goMyPlan}
      >
        <span>{copy.toMyPlan}</span>
        <span className="text-[var(--text-muted)]" aria-hidden>
          →
        </span>
      </button>
    </div>
  )
}
