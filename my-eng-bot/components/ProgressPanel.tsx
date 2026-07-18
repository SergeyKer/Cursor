'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { trackProgressEvent } from '@/lib/progress/analytics'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import {
  practiceBadgeRankEmoji,
} from '@/lib/practice/practiceBadges'
import type { RewardsState } from '@/lib/rewardsState'
import type { Settings, UsageInfo } from '@/lib/types'
import {
  progressCopy,
  type ProgressAudience,
} from '@/lib/uiCopy/progress'

export interface ProgressPanelProps {
  rewardsState: RewardsState | undefined
  settings: Settings
  usage: UsageInfo
  dialogueCorrectAnswers: number
  onMenuViewChange: (view: 'myPlan') => void
}

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

  const focusCell =
    status.focusGoal != null
      ? `${status.focusGoal.goalProgress}/${status.focusGoal.goalTarget}`
      : '—'
  const focusLabel = status.focusGoal?.label ?? copy.goalDone

  const xpPercent =
    shelf.xpToNextLevel > 0
      ? Math.min(100, Math.round((shelf.currentLevelXP / shelf.xpToNextLevel) * 100))
      : 0

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-2 py-2 text-center">
          <p className="emoji-line text-[18px] leading-none">{DAILY_STREAK_GLYPH}</p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text)]">
            {shelf.dailyStreak}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">{copy.daysShort}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-2 py-2 text-center">
          <p className="emoji-line text-[18px] leading-none">⭐</p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text)]">
            {shelf.level}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {audience === 'child' ? copy.levelShort : `${shelf.totalXP} XP`}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-2 py-2 text-center">
          <p className="text-[10px] font-medium text-[var(--text-muted)]">{copy.goalShort}</p>
          <p className="mt-0.5 text-[12px] font-semibold leading-tight text-[var(--text)]">{focusCell}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{focusLabel}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[12px] text-[var(--text-muted)]">
          {copy.recordLabel}: {shelf.bestDailyStreak} · {status.streakStatusLine}
          {shelf.streakCopy.bonusTodayLabel
            ? ` · ${shelf.streakCopy.bonusTodayLabel}`
            : ''}
        </p>
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--menu-control-bg)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
              style={{ width: `${xpPercent}%` }}
              role="progressbar"
              aria-valuenow={shelf.currentLevelXP}
              aria-valuemin={0}
              aria-valuemax={shelf.xpToNextLevel}
              aria-label={`${copy.levelToNext} ${shelf.level + 1}`}
            />
          </div>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            {copy.levelToNext} {shelf.level + 1} · {shelf.currentLevelXP}/{shelf.xpToNextLevel}
            {audience === 'adult' ? ' XP' : ''}
          </p>
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
            {` · бейджи ${shelf.lessonBadgesEarned}`}
          </p>
        )}
        <button
          type="button"
          className="mt-2 min-h-[44px] w-full rounded-md border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-left text-[13px] font-medium text-[var(--text)]"
          aria-expanded={shelfOpen}
          onClick={() => (shelfOpen ? setShelfOpen(false) : openShelf())}
        >
          {shelfOpen ? copy.hideShelf : copy.showShelf}
        </button>
        {shelfOpen ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[13px] font-medium text-[var(--text-muted)]">
                {copy.practiceBadgesTitle}
              </p>
              {shelf.nearestBadge ? (
                <p className="emoji-line mt-1 text-[14px] font-semibold text-[var(--text)]">
                  {shelf.nearestBadge.emoji} {shelf.nearestBadge.line}
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">{copy.allBadgeStepsDone}</p>
              )}
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Открыто {shelf.practiceBadgeStats.opened}/{shelf.practiceBadgeStats.total} · Золото{' '}
                {shelf.practiceBadgeStats.gold}/{shelf.practiceBadgeStats.total}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {shelf.practiceBadgeShelf.map((item) => (
                  <li
                    key={item.lessonId}
                    className="flex min-w-[4.5rem] flex-col items-center rounded-md border border-[var(--border)]/70 bg-[var(--menu-control-bg)] px-2 py-1.5"
                    title={item.currentName ?? item.nextName ?? item.topicTitle}
                  >
                    <span
                      className={`emoji-line text-[1.35rem] leading-none ${
                        item.rank === 0 ? 'opacity-40 grayscale' : ''
                      }`}
                    >
                      {item.emoji}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium text-[var(--text)]">
                      {practiceBadgeRankEmoji(item.rank)}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className="mt-2 space-y-1.5 text-[12px] text-[var(--text-muted)]">
                {shelf.practiceBadgeDefinitionRows.map((row) => (
                  <li key={`pb-${row.definition.lessonId}`}>
                    <p className="font-medium text-[var(--text)]">
                      {row.definition.emoji} {row.topic}
                    </p>
                    <p className="mt-0.5">
                      {row.definition.ranks.map((name, index) => {
                        const step = (index + 1) as 1 | 2 | 3
                        const done = row.rank >= step
                        return (
                          <span key={name} className="mr-2 inline-block">
                            {done ? '✓' : '·'} {name}
                          </span>
                        )
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-medium text-[var(--text-muted)]">
                {copy.practiceTopicsTitle}
              </p>
              {shelf.cupStats ? (
                <>
                  <p className="emoji-line mt-1 text-[14px] font-semibold text-[var(--text)]">
                    🏆 тем: {shelf.cupStats.cups}/{shelf.cupStats.withMedal || 0}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                    {audience === 'child'
                      ? 'Кубок темы — золото в уроке и практика.'
                      : 'Тема сдана 🏆 — золотая медаль в уроке и зачётные Челленджи.'}
                  </p>
                </>
              ) : null}
              {shelf.practiceRows.length === 0 ? (
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">{copy.needMedalFirst}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-muted)]">
                  {shelf.practiceRows.map((row) => (
                    <li
                      key={`practice-${row.lessonId}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{row.topic}</span>
                      <span className="emoji-line shrink-0 font-medium text-[var(--text)]">
                        {row.badgeText}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[13px] font-medium text-[var(--text-muted)]">
                {copy.lessonAwardsTitle}
              </p>
              <p className="emoji-line mt-1 text-[14px] text-[var(--text)]">
                🥇 {shelf.medals.gold} · 🥈 {shelf.medals.silver} · 🥉 {shelf.medals.bronze} ·
                Золото {shelf.medals.gold}/4
              </p>
              {shelf.cupStats ? (
                <p className="emoji-line mt-1 text-[14px] text-[var(--text)]">
                  Кубки тем: {shelf.cupStats.cups}/{shelf.cupStats.withMedal || 0}
                </p>
              ) : null}
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Бейджи: {shelf.lessonBadgesEarned}/{shelf.lessonBadgeTotal}
              </p>
              <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-muted)]">
                {shelf.lessonRows.map((row) => {
                  if (row.notStarted) {
                    return (
                      <li key={row.lessonId}>
                        {row.topic}: {audience === 'child' ? 'ещё не начат' : 'не начат'}
                      </li>
                    )
                  }
                  const medalLabel =
                    row.medal === 'started'
                      ? audience === 'child'
                        ? 'начат'
                        : 'начат'
                      : row.medal === '-'
                        ? '-'
                        : String(row.medal)
                  return (
                    <li key={row.lessonId}>
                      {row.topic}: {medalLabel}
                      {audience === 'adult' ? ` · ${row.corePercent}% core` : ''}
                      {audience === 'adult' ? row.cycleLabel : ''}
                      {row.badgePart}
                    </li>
                  )
                })}
              </ul>
            </div>
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
            <div className="h-2 overflow-hidden rounded-full bg-[var(--menu-control-bg)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
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
            {copy.nearRewardTitle}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">
            {status.opportunity.label}
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">{status.opportunity.reasonLine}</p>
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
