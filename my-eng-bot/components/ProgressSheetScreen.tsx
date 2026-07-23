'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import ProgressCard from '@/components/progress/ProgressCard'
import ProgressNavRow from '@/components/progress/ProgressNavRow'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  APP_BTN_TERTIARY_BACK,
  BLUE_PRIMARY_SKIN,
  BTN_DISABLED_CLASS,
  BTN_FONT_INLINE,
  BTN_INTERACTION_BASE,
} from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { getAttentionZones, listLearningSignals, loadSkillMasteryMap } from '@/lib/learningMemory'
import { buildMonthActivityGrid, lastSevenDayActivity } from '@/lib/progress/activityCalendar'
import { setProgressAnalyticsSink, trackProgressEvent } from '@/lib/progress/analytics'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { listLearningSignalFeed } from '@/lib/progress/formatLearningSignalForUser'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import type { PracticeRewardOpportunity } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import type { RewardsState } from '@/lib/rewardsState'
import type { Settings, UsageInfo } from '@/lib/types'
import { progressCopy, type ProgressAudience } from '@/lib/uiCopy/progress'

export type ProgressDetailKind = 'awards' | 'calendar' | 'remarks'

export type ProgressSheetScreenProps = {
  rewardsState: RewardsState | undefined
  settings: Settings
  usage: UsageInfo
  dialogueCorrectAnswers: number
  onBack: () => void
  onOpenMyPlan: () => void
  onOpenNearReward?: (opportunity: PracticeRewardOpportunity) => void | Promise<void>
  practiceBusy?: boolean
}

const ROW_CTA_BASE = [
  BTN_INTERACTION_BASE,
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-3 py-2 text-center whitespace-nowrap',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

const PRIMARY_ROW_CTA_CLASS = `${ROW_CTA_BASE} ${BLUE_PRIMARY_SKIN}`

function medalLabel(
  medal: string,
  audience: ProgressAudience,
  copy: ReturnType<typeof progressCopy>
): string {
  if (medal === '-' || medal === 'started') {
    return medal === 'started' ? copy.medalStarted : copy.medalNotStarted
  }
  return String(medal)
}

export default function ProgressSheetScreen({
  rewardsState,
  settings,
  usage,
  dialogueCorrectAnswers,
  onBack,
  onOpenMyPlan,
  onOpenNearReward,
  practiceBusy = false,
}: ProgressSheetScreenProps) {
  const audience: ProgressAudience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = progressCopy(audience)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<ProgressDetailKind | null>(null)

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

  const attentionZones = useMemo(
    () => getAttentionZones(listLearningSignals(), loadSkillMasteryMap()),
    // refresh when opening / returning to overview
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, rewardsState]
  )

  const remarks = useMemo(
    () => listLearningSignalFeed(listLearningSignals(), audience, detail === 'remarks' ? 40 : 10),
    [audience, detail, rewardsState]
  )

  const activeDays = rewardsState?.progress.activeDays ?? []
  const monthGrid = useMemo(() => buildMonthActivityGrid(activeDays), [activeDays])
  const weekBars = useMemo(() => lastSevenDayActivity(activeDays), [activeDays])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setProgressAnalyticsSink((event, props) => {
        console.debug('[progress]', event, props)
      })
    }
    trackProgressEvent('progress_space_opened', { audience })
    trackProgressEvent('progress_viewed', { audience })
  }, [audience])

  const openDetail = (kind: ProgressDetailKind) => {
    setDetail(kind)
    trackProgressEvent('progress_detail_opened', { audience, detailKind: kind })
  }

  const handleBack = () => {
    if (detail) {
      setDetail(null)
      return
    }
    trackProgressEvent('progress_space_back', { audience })
    onBack()
  }

  const goMyPlan = () => {
    trackProgressEvent('progress_to_my_plan_click', { audience })
    onOpenMyPlan()
  }

  const xpPercent =
    shelf.xpToNextLevel > 0
      ? Math.min(100, Math.round((shelf.currentLevelXP / shelf.xpToNextLevel) * 100))
      : 0

  const awardsSummary = shelf.isEmptyShelf
    ? null
    : `🥇 ${shelf.medals.gold} · 🥈 ${shelf.medals.silver} · 🥉 ${shelf.medals.bronze}${
        shelf.cupStats ? ` · 🏆 ${shelf.cupStats.cups}` : ''
      }`

  const headerTitle =
    detail === 'awards'
      ? 'Прогресс · Награды'
      : detail === 'calendar'
        ? 'Прогресс · Календарь'
        : detail === 'remarks'
          ? 'Прогресс · Замечания'
          : 'Прогресс'

  const overview = (
    <div className="w-full min-w-0 space-y-2.5">
      <ProgressCard title={copy.statusCardTitle} tone={status.streakAtRisk ? 'warning' : 'default'}>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="emoji-line text-[18px] leading-none">{DAILY_STREAK_GLYPH}</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text)]">
              {shelf.dailyStreak}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">{copy.daysShort}</p>
          </div>
          <div className="text-center">
            <p className="emoji-line text-[18px] leading-none">⭐</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text)]">
              {shelf.level}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {audience === 'child' ? copy.levelShort : `${shelf.totalXP} XP`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[12px] font-medium text-[var(--text-muted)]">{copy.goalShort}</p>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-[var(--text)]">
              {status.focusGoal
                ? `${status.focusGoal.goalProgress}/${status.focusGoal.goalTarget}`
                : '—'}
            </p>
          </div>
        </div>
        <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
          {copy.recordLabel}: {shelf.bestDailyStreak} · {status.streakStatusLine}
        </p>
        <div>
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
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            {copy.levelToNext} {shelf.level + 1} · {shelf.currentLevelXP}/{shelf.xpToNextLevel}
            {audience === 'adult' ? ' XP' : ''}
          </p>
        </div>
      </ProgressCard>

      {status.opportunity ? (
        <button
          type="button"
          disabled={practiceBusy || !onOpenNearReward || !shelf.opportunity}
          className="w-full min-w-0 rounded-[var(--bubble-radius-assistant,var(--bubble-radius))] border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-3 text-left touch-manipulation disabled:opacity-60"
          onClick={() => {
            if (!shelf.opportunity || !onOpenNearReward) return
            trackProgressEvent('progress_near_reward_click', {
              audience,
              lessonId: shelf.opportunity.lessonId,
              reason: shelf.opportunity.reason,
            })
            void onOpenNearReward(shelf.opportunity)
          }}
        >
          <p className="text-[13px] font-medium text-[var(--status-info-text)]">{copy.nearRewardTitle}</p>
          <p className="mt-1 break-words text-[17px] font-semibold leading-snug text-[var(--text)]">
            {status.opportunity.label}
          </p>
          <p className="mt-1 break-words text-[13px] leading-snug text-[var(--text-muted)]">
            {status.opportunity.reasonLine}
          </p>
          <p className="mt-2 text-[14px] font-medium text-[var(--accent)]">{copy.continuePractice} →</p>
        </button>
      ) : null}

      {attentionZones.length > 0 ? (
        <ProgressCard title={copy.weakZonesTitle}>
          <ul className="divide-y divide-[var(--chat-section-neutral-border)]">
            {attentionZones.map((z) => (
              <li key={z.skillTagId} className="-mx-4">
                <ProgressNavRow
                  label={`${z.title} · ${z.sourceHint}${z.errorCount > 0 ? ` · ${z.errorCount}` : ''}`}
                  onClick={() => {
                    trackProgressEvent('progress_weak_zone_click', { audience })
                    goMyPlan()
                  }}
                />
              </li>
            ))}
          </ul>
        </ProgressCard>
      ) : null}

      <ProgressCard
        title={copy.todayTitle}
        footer={
          <ProgressNavRow
            label={copy.toGoalsMyPlan}
            ariaLabel={copy.toGoalsMyPlanAria}
            onClick={goMyPlan}
          />
        }
      >
        {status.modeGoals.map((goal) => (
          <div key={goal.mode}>
            <p className="break-words text-[15px] leading-[1.45] text-[var(--text)]">{goal.line}</p>
            <p className="text-[13px] text-[var(--text-muted)]">{goal.statusLabel}</p>
          </div>
        ))}
      </ProgressCard>

      <ProgressCard
        title={copy.awardsTitle}
        footer={
          <ProgressNavRow
            label={copy.awardsOpen}
            ariaLabel={copy.awardsOpenAria}
            onClick={() => openDetail('awards')}
          />
        }
      >
        {shelf.isEmptyShelf ? (
          <>
            <p className="break-words text-[15px] font-semibold text-[var(--text)]">{copy.emptyTitle}</p>
            <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.emptyBody}</p>
          </>
        ) : (
          <p className="emoji-line break-words text-[15px] leading-[1.45] text-[var(--text)]">
            {awardsSummary}
          </p>
        )}
      </ProgressCard>

      {activeDays.length > 0 ? (
        <ProgressCard
          title={copy.calendarTitle}
          footer={
            <ProgressNavRow label={copy.calendarOpen} onClick={() => openDetail('calendar')} />
          }
        >
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.cells.map((cell, i) => (
              <div
                key={cell.date ?? `pad-${i}`}
                className={`flex h-7 items-center justify-center rounded text-[11px] tabular-nums ${
                  !cell.inMonth
                    ? 'opacity-0'
                    : cell.active
                      ? 'bg-[var(--accent)]/20 font-semibold text-[var(--text)]'
                      : 'text-[var(--text-muted)]'
                } ${cell.isToday ? 'ring-1 ring-[var(--accent)]' : ''}`}
              >
                {cell.date ? Number(cell.date.slice(8)) : ''}
              </div>
            ))}
          </div>
        </ProgressCard>
      ) : null}

      <ProgressCard
        title={copy.remarksTitle}
        footer={
          remarks.length > 0 ? (
            <ProgressNavRow label={copy.remarksMore} onClick={() => openDetail('remarks')} />
          ) : null
        }
      >
        {remarks.length === 0 ? (
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
            {copy.remarksEmpty}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {remarks.slice(0, 7).map((item) => (
              <li key={item.id} className="break-words text-[14px] leading-snug text-[var(--text)]">
                <span className="text-[var(--text-muted)]">{item.relativeDay}</span>
                {' · '}
                {item.line}
              </li>
            ))}
          </ul>
        )}
      </ProgressCard>

      <ProgressCard title={copy.balanceTitle}>
        <p className="emoji-line break-words text-[15px] leading-[1.45] text-[var(--text)]">
          🪙 {shelf.currencies.coins} {copy.coinsLabel} · 💎 {shelf.currencies.gems} {copy.gemsLabel}{' '}
          · 🎫 {shelf.currencies.tickets} {copy.ticketsLabel}
        </p>
        <p className="break-words text-[14px] text-[var(--text)]">
          {copy.dialogueCorrect}: {dialogueCorrectAnswers}
        </p>
        <p className="break-words text-[14px] text-[var(--text)]">
          {copy.usageLabel}:{' '}
          {audience === 'child'
            ? usage.used
            : usage.limit > 0
              ? `${usage.used} / ${usage.limit}`
              : `${usage.used}`}
        </p>
        <p className="break-words text-[13px] leading-snug text-[var(--text-muted)]">{copy.premiumCue}</p>
      </ProgressCard>
    </div>
  )

  const awardsDetail = (
    <div className="w-full min-w-0 space-y-2.5">
      <ProgressCard title={copy.lessonsSection}>
        <ul className="space-y-1.5">
          {shelf.lessonRows.map((row) => (
            <li key={row.lessonId} className="break-words text-[15px] leading-[1.45] text-[var(--text)]">
              {row.topic}:{' '}
              {row.notStarted
                ? copy.medalNotStarted
                : medalLabel(String(row.medal), audience, copy)}
              {audience === 'adult' && !row.notStarted && row.medal !== 'started' && row.medal !== '-'
                ? ` · ${row.corePercent}%`
                : ''}
              {audience === 'adult' ? row.cycleLabel : ''}
              {row.badgePart}
            </li>
          ))}
        </ul>
      </ProgressCard>
      <ProgressCard title={copy.practiceSection}>
        {shelf.practiceRows.length === 0 ? (
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
            {copy.needMedalFirst}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {shelf.practiceRows.map((row) => (
              <li
                key={row.lessonId}
                className="flex items-center justify-between gap-2 break-words text-[15px] leading-[1.45] text-[var(--text)]"
              >
                <span className="min-w-0">{row.topic}</span>
                <span className="emoji-line shrink-0 font-medium">{row.badgeText}</span>
              </li>
            ))}
          </ul>
        )}
      </ProgressCard>
    </div>
  )

  const calendarDetail = (
    <div className="w-full min-w-0 space-y-2.5">
      <ProgressCard title={copy.calendarTitle}>
        <div className="grid grid-cols-7 gap-1">
          {monthGrid.cells.map((cell, i) => (
            <div
              key={cell.date ?? `pad-${i}`}
              className={`flex h-8 items-center justify-center rounded text-[12px] tabular-nums ${
                !cell.inMonth
                  ? 'opacity-0'
                  : cell.active
                    ? 'bg-[var(--accent)]/20 font-semibold text-[var(--text)]'
                    : 'text-[var(--text-muted)]'
              } ${cell.isToday ? 'ring-1 ring-[var(--accent)]' : ''}`}
            >
              {cell.date ? Number(cell.date.slice(8)) : ''}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-1">
          {weekBars.map((bar) => (
            <div key={bar.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm ${
                  bar.active ? 'bg-[var(--accent)]' : 'bg-[var(--menu-control-bg)]'
                }`}
                style={{ height: bar.active ? 28 : 10 }}
              />
              <span className="text-[10px] text-[var(--text-muted)]">{Number(bar.date.slice(8))}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 break-words text-[14px] leading-snug text-[var(--text-muted)]">
          {status.streakStatusLine}
        </p>
      </ProgressCard>
    </div>
  )

  const remarksDetail = (
    <div className="w-full min-w-0 space-y-2.5">
      <ProgressCard title={copy.remarksTitle}>
        {remarks.length === 0 ? (
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
            {copy.remarksEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {remarks.map((item) => (
              <li key={item.id} className="break-words text-[15px] leading-[1.45] text-[var(--text)]">
                <span className="text-[var(--text-muted)]">{item.relativeDay}</span>
                {' · '}
                {item.line}
              </li>
            ))}
          </ul>
        )}
      </ProgressCard>
    </div>
  )

  const body =
    detail === 'awards'
      ? awardsDetail
      : detail === 'calendar'
        ? calendarDetail
        : detail === 'remarks'
          ? remarksDetail
          : overview

  return (
    <LessonReadingShell
      scrollRef={scrollRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} chat-feed-wallpaper py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
      composer={
        <div className="flex w-full items-center gap-1.5">
          <button type="button" onClick={handleBack} className={APP_BTN_TERTIARY_BACK}>
            {copy.back}
          </button>
          {!detail ? (
            <button type="button" onClick={goMyPlan} className={PRIMARY_ROW_CTA_CLASS}>
              {copy.myPlanButton}
            </button>
          ) : null}
        </div>
      }
    >
      <p className="mb-2 px-1 text-[13px] font-medium text-[var(--text-muted)]" aria-live="polite">
        {headerTitle}
      </p>
      {body}
    </LessonReadingShell>
  )
}
