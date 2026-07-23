'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import ProgressCard from '@/components/progress/ProgressCard'
import ProgressFooterButton from '@/components/progress/ProgressFooterButton'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  APP_BTN_TERTIARY_BACK,
  BTN_DISABLED_CLASS,
  BTN_FONT_INLINE,
  BTN_INTERACTION_BASE,
} from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { getAttentionZones, listLearningSignals, loadSkillMasteryMap } from '@/lib/learningMemory'
import { featureFlags } from '@/lib/featureFlags'
import { buildMonthActivityGrid, lastSevenDayActivity } from '@/lib/progress/activityCalendar'
import { setProgressAnalyticsSink, trackProgressEvent } from '@/lib/progress/analytics'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { listLearningSignalFeed } from '@/lib/progress/formatLearningSignalForUser'
import {
  buildProgressMyPlanSnapshot,
  buildProgressNowCta,
  mapAttentionZoneToTarget,
  type ProgressDetailKind,
  type ProgressLaunchTarget,
} from '@/lib/progress/progressActions'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import { pickFocusModeGoal } from '@/lib/progressFocusGoal'
import type { PracticeRewardOpportunity } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'
import type { Settings, UsageInfo } from '@/lib/types'
import { progressCopy, type ProgressAudience } from '@/lib/uiCopy/progress'

export type ProgressSheetScreenProps = {
  rewardsState: RewardsState | undefined
  settings: Settings
  usage: UsageInfo
  dialogueCorrectAnswers: number
  onBack: () => void
  onOpenMyPlan: () => void
  onOpenNearReward?: (opportunity: PracticeRewardOpportunity) => void | Promise<void>
  onLaunchTarget?: (target: ProgressLaunchTarget) => void | Promise<void>
  practiceBusy?: boolean
  canUseAiReinforce?: boolean
}

const COMPOSER_MY_PLAN = [
  BTN_INTERACTION_BASE,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
].join(' ')

function medalLabel(
  medal: string | null | undefined,
  audience: ProgressAudience,
  copy: ReturnType<typeof progressCopy>
): string {
  if (!medal || medal === '-' || medal === 'started') {
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
  onLaunchTarget,
  practiceBusy = false,
  canUseAiReinforce = false,
}: ProgressSheetScreenProps) {
  const audience: ProgressAudience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = progressCopy(audience)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<ProgressDetailKind | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const shelf = useMemo(() => buildProgressShelf(rewardsState), [rewardsState, refreshKey])
  const status = useMemo(
    () =>
      buildProgressStatusCopy({
        rewardsState,
        copy,
        audience,
        cupsEnabled: shelf.cupsEnabled,
        opportunity: shelf.opportunity,
      }),
    [rewardsState, copy, audience, shelf.cupsEnabled, shelf.opportunity, refreshKey]
  )

  const attentionZones = useMemo(
    () => getAttentionZones(listLearningSignals(), loadSkillMasteryMap()),
    [detail, rewardsState, refreshKey]
  )

  const planSnapshot = useMemo(
    () =>
      buildProgressMyPlanSnapshot(settings, rewardsState, {
        attentionZones,
        canUseAiReinforce,
      }),
    [settings, rewardsState, attentionZones, canUseAiReinforce, refreshKey]
  )

  const nowCta = useMemo(
    () =>
      buildProgressNowCta(
        planSnapshot.mainTask,
        copy.openMyPlanCta,
        copy.openMyPlanCtaAria,
        planSnapshot.programTask
      ),
    [
      planSnapshot.mainTask,
      planSnapshot.programTask,
      copy.openMyPlanCta,
      copy.openMyPlanCtaAria,
    ]
  )

  const remarks = useMemo(
    () => listLearningSignalFeed(listLearningSignals(), audience, detail === 'remarks' ? 40 : 10),
    [audience, detail, rewardsState, refreshKey]
  )

  const activeDays = rewardsState?.progress.activeDays ?? []
  const monthGrid = useMemo(() => buildMonthActivityGrid(activeDays), [activeDays])
  const weekBars = useMemo(() => lastSevenDayActivity(activeDays), [activeDays])
  const today = getTodayDateString()
  const todayActive = activeDays.includes(today)
  const focusGoal = pickFocusModeGoal(rewardsState)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setProgressAnalyticsSink((event, props) => {
        console.debug('[progress]', event, props)
      })
    }
    trackProgressEvent('progress_space_opened', { audience })
    trackProgressEvent('progress_viewed', { audience })
  }, [audience])

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const launch = (
    target: ProgressLaunchTarget,
    surface:
      | 'now'
      | 'status'
      | 'near'
      | 'zone'
      | 'today'
      | 'awards'
      | 'calendar'
      | 'remarks'
      | 'balance'
      | 'strip'
  ) => {
    trackProgressEvent('progress_footer_click', {
      audience,
      variant: target.kind === 'my_plan' || target.kind === 'detail' ? 'action' : 'launch',
      surface,
    })
    if (target.kind === 'my_plan') {
      trackProgressEvent('progress_to_my_plan_click', { audience })
      onOpenMyPlan()
      return
    }
    if (target.kind === 'detail') {
      setDetail(target.detail)
      trackProgressEvent('progress_detail_opened', { audience, detailKind: target.detail })
      return
    }
    void onLaunchTarget?.(target)
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

  const saveStreak = () => {
    trackProgressEvent('progress_streak_save_click', { audience })
    const mode = focusGoal?.mode ?? 'communication'
    void onLaunchTarget?.(mode === 'engvo' ? { kind: 'engvo' } : { kind: 'communication' })
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
      <ProgressCard
        title={copy.nowCardTitle}
        footer={
          <ProgressFooterButton
            variant={nowCta.variant}
            label={nowCta.label}
            ariaLabel={nowCta.ariaLabel}
            disabled={practiceBusy && nowCta.variant === 'launch'}
            onClick={() => {
              trackProgressEvent('progress_now_click', {
                audience,
                variant: nowCta.variant,
                surface: 'now',
              })
              if (nowCta.target.kind === 'my_plan') {
                goMyPlan()
                return
              }
              if (nowCta.target.kind === 'detail') {
                setDetail(nowCta.target.detail)
                trackProgressEvent('progress_detail_opened', {
                  audience,
                  detailKind: nowCta.target.detail,
                })
                return
              }
              void onLaunchTarget?.(nowCta.target)
            }}
          />
        }
      >
        {planSnapshot.mainTask || planSnapshot.programTask ? (
          <>
            <p className="break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]">
              {(planSnapshot.mainTask ?? planSnapshot.programTask)!.title}
            </p>
            {(planSnapshot.mainTask ?? planSnapshot.programTask)!.reasonLine ? (
              <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
                {(planSnapshot.mainTask ?? planSnapshot.programTask)!.reasonLine}
              </p>
            ) : null}
          </>
        ) : (
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
            {copy.openMyPlanCta}
          </p>
        )}
      </ProgressCard>

      <ProgressCard
        title={copy.statusCardTitle}
        tone={status.streakAtRisk ? 'warning' : 'default'}
        footer={
          status.streakAtRisk ? (
            <ProgressFooterButton
              variant="launch"
              label={copy.saveStreak}
              ariaLabel={copy.saveStreakAria}
              disabled={practiceBusy}
              onClick={saveStreak}
            />
          ) : null
        }
      >
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

      {status.opportunity && shelf.opportunity ? (
        <div className="w-full min-w-0 overflow-hidden rounded-[var(--bubble-radius-assistant,var(--bubble-radius))] border border-[var(--status-info-border)] bg-[var(--status-info-bg)]">
          <div className="px-4 py-3 text-left">
            <p className="text-[13px] font-medium text-[var(--status-info-text)]">{copy.nearRewardTitle}</p>
            <p className="mt-1 break-words text-[17px] font-semibold leading-snug text-[var(--text)]">
              {status.opportunity.label}
            </p>
            <p className="mt-1 break-words text-[13px] leading-snug text-[var(--text-muted)]">
              {status.opportunity.reasonLine}
            </p>
          </div>
          <ProgressFooterButton
            variant="launch"
            label={copy.continuePractice}
            disabled={practiceBusy || !onOpenNearReward}
            onClick={() => {
              if (!shelf.opportunity || !onOpenNearReward) return
              trackProgressEvent('progress_near_reward_click', {
                audience,
                lessonId: shelf.opportunity.lessonId,
                reason: shelf.opportunity.reason,
                surface: 'near',
                variant: 'launch',
              })
              void onOpenNearReward(shelf.opportunity)
            }}
          />
        </div>
      ) : null}

      <ProgressCard
        title={copy.weakZonesTitle}
        footer={
          attentionZones.length === 0 ? (
            <ProgressFooterButton
              variant="action"
              label={copy.toGoalsMyPlan}
              ariaLabel={copy.toGoalsMyPlanAria}
              onClick={goMyPlan}
            />
          ) : null
        }
      >
        {attentionZones.length === 0 ? (
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
            {copy.weakZonesEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {attentionZones.map((z) => {
              const target = mapAttentionZoneToTarget(z)
              const isLaunch = target.kind !== 'my_plan'
              return (
                <li key={z.skillTagId} className="min-w-0 space-y-1">
                  <p className="break-words text-[15px] leading-[1.45] text-[var(--text)]">
                    {z.title} · {z.sourceHint}
                    {z.errorCount > 0 ? ` · ${z.errorCount}` : ''}
                  </p>
                  <ProgressFooterButton
                    variant={isLaunch ? 'launch' : 'action'}
                    label={isLaunch ? copy.weakZoneRepeat : copy.toGoalsMyPlan}
                    disabled={practiceBusy && isLaunch}
                    roundBottom={false}
                    onClick={() => {
                      trackProgressEvent('progress_zone_launch', {
                        audience,
                        surface: 'zone',
                        variant: isLaunch ? 'launch' : 'action',
                        lessonId: z.lessonId ?? undefined,
                      })
                      launch(target, 'zone')
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </ProgressCard>

      <ProgressCard
        title={copy.todayTitle}
        footer={
          <ProgressFooterButton
            variant="action"
            label={copy.toGoalsMyPlan}
            ariaLabel={copy.toGoalsMyPlanAria}
            onClick={() => {
              trackProgressEvent('progress_footer_click', {
                audience,
                surface: 'today',
                variant: 'action',
              })
              goMyPlan()
            }}
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
          <ProgressFooterButton
            variant="action"
            label={copy.awardsOpen}
            ariaLabel={copy.awardsOpenAria}
            onClick={() => launch({ kind: 'detail', detail: 'awards' }, 'awards')}
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
            <ProgressFooterButton
              variant={todayActive ? 'action' : 'launch'}
              label={todayActive ? copy.calendarOpen : copy.calendarDoToday}
              disabled={practiceBusy && !todayActive}
              onClick={() => {
                if (todayActive) {
                  launch({ kind: 'detail', detail: 'calendar' }, 'calendar')
                  return
                }
                trackProgressEvent('progress_footer_click', {
                  audience,
                  surface: 'calendar',
                  variant: 'launch',
                })
                saveStreak()
              }}
            />
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
            <ProgressFooterButton
              variant={
                attentionZones[0]?.lessonId && attentionZones[0].chipActive ? 'launch' : 'action'
              }
              label={
                attentionZones[0]?.lessonId && attentionZones[0].chipActive
                  ? copy.remarksReview
                  : copy.remarksMore
              }
              disabled={practiceBusy}
              onClick={() => {
                if (attentionZones[0]?.lessonId && attentionZones[0].chipActive) {
                  trackProgressEvent('progress_footer_click', {
                    audience,
                    surface: 'remarks',
                    variant: 'launch',
                  })
                  void onLaunchTarget?.(mapAttentionZoneToTarget(attentionZones[0]))
                  return
                }
                setDetail('remarks')
                trackProgressEvent('progress_detail_opened', {
                  audience,
                  detailKind: 'remarks',
                })
              }}
            />
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

      <nav
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-1 py-1 text-[13px] text-[var(--text-muted)]"
        aria-label="Режимы"
      >
        {(
          [
            { label: copy.modesLesson, target: { kind: 'lesson' as const, lessonId: '' }, mode: 'lesson' },
            { label: copy.modesPractice, target: { kind: 'quick_practice' as const }, mode: 'practice' },
            { label: copy.modesChat, target: { kind: 'communication' as const }, mode: 'communication' },
            { label: copy.modesCall, target: { kind: 'engvo' as const }, mode: 'engvo' },
            { label: copy.modesPlan, target: { kind: 'my_plan' as const }, mode: 'plan' },
            ...(featureFlags.referenceV1
              ? [{ label: copy.modesReference, target: { kind: 'my_plan' as const }, mode: 'reference' }]
              : []),
          ] as const
        ).map((item, idx, arr) => (
          <span key={item.mode} className="inline-flex items-center gap-2">
            <button
              type="button"
              className="touch-manipulation font-medium text-[var(--text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              onClick={() => {
                trackProgressEvent('progress_mode_strip_click', {
                  audience,
                  surface: 'strip',
                  mode: item.mode,
                })
                if (item.mode === 'lesson') {
                  void onLaunchTarget?.({ kind: 'my_plan' })
                  return
                }
                if (item.mode === 'reference') {
                  void onLaunchTarget?.({ kind: 'my_plan' })
                  return
                }
                launch(item.target, 'strip')
              }}
            >
              {item.label}
            </button>
            {idx < arr.length - 1 ? <span aria-hidden>·</span> : null}
          </span>
        ))}
      </nav>
    </div>
  )

  const awardsDetail = (
    <div className="w-full min-w-0 space-y-2.5">
      <ProgressCard title={copy.lessonsSection}>
        <ul className="space-y-2">
          {shelf.lessonRows.map((row) => (
            <li key={row.lessonId} className="min-w-0 space-y-1">
              <p className="break-words text-[15px] leading-[1.45] text-[var(--text)]">
                {row.topic}: {medalLabel(row.medal, audience, copy)}
              </p>
              {!row.notStarted ? (
                <ProgressFooterButton
                  variant="launch"
                  label={copy.startLessonRow}
                  disabled={practiceBusy}
                  roundBottom={false}
                  onClick={() =>
                    void onLaunchTarget?.({ kind: 'lesson', lessonId: row.lessonId })
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      </ProgressCard>
      <ProgressCard title={copy.practiceSection}>
        <ul className="space-y-2">
          {shelf.practiceRows.map((row) => (
            <li key={row.lessonId} className="min-w-0 space-y-1">
              <p className="break-words text-[15px] leading-[1.45] text-[var(--text)]">
                {row.topic}
                {row.badgeText ? ` · ${row.badgeText}` : ''}
              </p>
              <ProgressFooterButton
                variant="launch"
                label={copy.startPracticeRow}
                disabled={practiceBusy}
                roundBottom={false}
                onClick={() =>
                  void onLaunchTarget?.({
                    kind: 'practice',
                    lessonId: row.lessonId,
                    mode: 'balanced',
                  })
                }
              />
            </li>
          ))}
        </ul>
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
          {weekBars.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm ${d.active ? 'bg-[var(--accent)]' : 'bg-[var(--menu-control-bg)]'}`}
                style={{ height: d.active ? 28 : 8 }}
              />
              <span className="text-[10px] text-[var(--text-muted)]">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
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
            <button type="button" onClick={goMyPlan} className={COMPOSER_MY_PLAN}>
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
