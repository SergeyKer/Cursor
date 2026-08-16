'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import ProgressAwardsStats from '@/components/progress/ProgressAwardsStats'
import ProgressCard from '@/components/progress/ProgressCard'
import ProgressFooterButton from '@/components/progress/ProgressFooterButton'
import ProgressModeNavRow from '@/components/progress/ProgressModeNavRow'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  APP_BTN_TERTIARY_BACK,
  BTN_DISABLED_CLASS,
  BTN_FONT_INLINE,
  BTN_INTERACTION_BASE,
  CARD_EXPAND_SKIN,
  CARD_LAUNCH_SKIN,
} from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { getAttentionZones, listLearningSignals, loadSkillMasteryMap } from '@/lib/learningMemory'
import { featureFlags } from '@/lib/featureFlags'
import { buildMonthActivityGrid, lastSevenDayActivity } from '@/lib/progress/activityCalendar'
import { setProgressAnalyticsSink, trackProgressEvent } from '@/lib/progress/analytics'
import { summarizeAllAccentProgress } from '@/lib/accent/progressStorage'
import { buildProgressModeRows, countVocabProgressMarks } from '@/lib/progress/buildProgressModeRows'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { listLearningSignalFeed } from '@/lib/progress/formatLearningSignalForUser'
import {
  mapAttentionZoneToTarget,
  type ProgressDetailKind,
  type ProgressLaunchTarget,
} from '@/lib/progress/progressActions'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import { toggleTopicAwardExpanded } from '@/lib/progress/topicAwardRows'
import ProgressTopicAwardsList from '@/components/progress/ProgressTopicAwardsList'
import type { PracticeRewardOpportunity } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'
import type { Settings, UsageInfo } from '@/lib/types'
import { progressCopy, formatAttentionZoneMeta, type ProgressAudience } from '@/lib/uiCopy/progress'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import { loadVocabularyProgress } from '@/lib/vocabulary/storage'

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
}

const COMPOSER_MY_PLAN = [
  BTN_INTERACTION_BASE,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
].join(' ')

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

/** Inset expand: same rounded-xl as opportunity; wrap cancels ProgressCard px-4. */
const STATUS_INSET_EXPAND_WRAP = '-mx-4 px-2.5 pt-3 sm:px-3'

const STATUS_INSET_EXPAND_BTN = [
  BTN_INTERACTION_BASE,
  CARD_EXPAND_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center',
].join(' ')

const ZONES_CARD_CLASS = `${STATUS_TILE_CLASS} !p-0`

const ZONES_HEADER_TITLE =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

const ZONES_LAUNCH_BTN = [
  BTN_INTERACTION_BASE,
  CARD_LAUNCH_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center',
].join(' ')

const ZONES_INSET_LAUNCH_BTN = [
  BTN_INTERACTION_BASE,
  CARD_LAUNCH_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'mt-1 flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center',
].join(' ')

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
}: ProgressSheetScreenProps) {
  const audience: ProgressAudience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = progressCopy(audience)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<ProgressDetailKind | null>(null)
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
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

  const modeRows = useMemo(() => {
    const vocab = countVocabProgressMarks(
      loadVocabularyProgress().words,
      loadVocabMistakes().length
    )
    const tutor = rewardsState?.tutorSession
    return buildProgressModeRows({
      copy,
      audience,
      flags: {
        engvoVoiceV1: featureFlags.engvoVoiceV1,
        practiceEngineV1: featureFlags.practiceEngineV1,
        tutorChatV1: featureFlags.tutorChatV1,
        accentTrainerV1: featureFlags.accentTrainerV1,
      },
      rewardsState,
      medals: shelf.medals,
      practiceBadgeStats: shelf.practiceBadgeStats,
      nearestBadge: shelf.nearestBadge,
      vocab,
      tutorTodayCount:
        (tutor?.awardedExplainKeys.length ?? 0) + (tutor?.awardedMicroKeys.length ?? 0),
      accent: summarizeAllAccentProgress(),
    })
  }, [audience, copy, rewardsState, shelf.medals, shelf.nearestBadge, shelf.practiceBadgeStats, refreshKey])

  const attentionZones = useMemo(
    () => getAttentionZones(listLearningSignals(), loadSkillMasteryMap()),
    [detail, rewardsState, refreshKey]
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
      variant:
        target.kind === 'detail'
          ? 'expand'
          : target.kind === 'my_plan'
            ? 'action'
            : 'launch',
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
      setExpandedLessonId(null)
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
      } · ${copy.lessonBadgesSummary} ${shelf.lessonBadgesEarned}`

  const overview = (
    <div className="w-full min-w-0 space-y-2.5">
      <div className="w-full min-w-0 space-y-2">
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
              <p className="mt-2 text-[14px] leading-snug text-[var(--text-muted)]">{status.streakStatusBody}</p>
            ) : null}
          </div>
          <button
            type="button"
            className={STATUS_INSET_LAUNCH_BTN}
            aria-label={`${status.streakCtaLabel} — открыть Мой план`}
            disabled={practiceBusy}
            onClick={saveStreak}
          >
            <span className="min-w-0 break-words">{status.streakCtaLabel}</span>
          </button>
        </div>
      </div>

      {status.opportunity && shelf.opportunity ? (
        <div className={STATUS_STREAK_TILE_CLASS}>
          <div className="min-w-0">
            <p className="break-words text-[17px] font-semibold leading-snug text-[var(--text)]">
              {status.opportunity.label}
            </p>
            <p className="mt-2 break-words text-[14px] leading-snug text-[var(--text-muted)]">
              {status.opportunity.reasonLine}
            </p>
          </div>
          <button
            type="button"
            className={STATUS_INSET_LAUNCH_BTN}
            aria-label={`${copy.nearRewardTitle} — ${status.opportunity.ctaLabel}`}
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
          >
            <span className="min-w-0 break-words">{status.opportunity.ctaLabel}</span>
          </button>
        </div>
      ) : null}

      {/* TODO(0.20): канон Дейлик v2 — слот «скоро», без фейкового счётчика */}
      <div className={ZONES_CARD_CLASS}>
        <p className={`px-4 pt-3 pb-1 ${ZONES_HEADER_TITLE}`}>{copy.ritualTitle}</p>
        <div className="space-y-1.5 px-4 pb-3 pt-2.5">
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.ritualDailySoon}</p>
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.ritualStreakSoon}</p>
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.ritualRubySoon}</p>
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.ritualMilestonesSoon}</p>
          <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.ritualLaterTail}</p>
        </div>
      </div>

      <div className={ZONES_CARD_CLASS}>
        <p className={`px-4 pt-3 pb-1 ${ZONES_HEADER_TITLE}`}>{copy.weakZonesTitle}</p>
        {attentionZones.length === 0 ? (
          <p className="break-words px-4 pt-2.5 text-[14px] leading-snug text-[var(--text-muted)]">
            {copy.weakZonesEmpty}
          </p>
        ) : (
          <ul className="space-y-4 px-4 pt-2.5">
            {attentionZones.map((z, index) => {
              const target = mapAttentionZoneToTarget(z)
              const isLaunch = target.kind !== 'my_plan'
              return (
                <li key={z.skillTagId} className="min-w-0">
                  <p className="flex min-w-0 items-start gap-2">
                    <span className="w-5 shrink-0 text-[15px] font-medium tabular-nums leading-[1.45] text-[var(--text-muted)]">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]">
                      {z.title}
                    </span>
                  </p>
                  <p className="mt-0.5 break-words pl-7 text-[14px] leading-snug text-[var(--text-muted)]">
                    {formatAttentionZoneMeta(z.sourceHint, z.errorCount)}
                  </p>
                  {isLaunch ? (
                    <button
                      type="button"
                      className={ZONES_INSET_LAUNCH_BTN}
                      disabled={practiceBusy}
                      onClick={() => {
                        trackProgressEvent('progress_zone_launch', {
                          audience,
                          surface: 'zone',
                          variant: 'launch',
                          lessonId: z.lessonId ?? undefined,
                        })
                        launch(target, 'zone')
                      }}
                    >
                      <span className="min-w-0 break-words">{copy.weakZoneRepeat}</span>
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
        <div className="px-2.5 pt-3 pb-2.5 sm:px-3">
          <button
            type="button"
            className={ZONES_LAUNCH_BTN}
            aria-label={copy.weakZonesCtaAria}
            onClick={goMyPlan}
          >
            <span className="min-w-0 break-words">{copy.weakZonesCta}</span>
          </button>
        </div>
      </div>

      <div className={ZONES_CARD_CLASS}>
        <p className={`px-4 pt-3 pb-1 ${ZONES_HEADER_TITLE}`}>{copy.todayTitle}</p>
        <div className="divide-y divide-[var(--chat-section-neutral-border)] pb-1">
          {modeRows.map((row) => (
            <ProgressModeNavRow
              key={row.id}
              title={row.label}
              metric={row.metric}
              ariaLabel={`${row.label} · ${row.metric}`}
              disabled={practiceBusy}
              onClick={() => {
                trackProgressEvent('progress_mode_strip_click', {
                  audience,
                  surface: 'today',
                  mode: row.id,
                })
                launch(row.target, 'today')
              }}
            />
          ))}
        </div>
      </div>

      <ProgressCard title={copy.awardsTitle}>
        <div>
          <div className="space-y-1.5">
            {shelf.isEmptyShelf ? (
              <>
                <p className="break-words text-[15px] font-semibold text-[var(--text)]">{copy.emptyTitle}</p>
                <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{copy.emptyBody}</p>
              </>
            ) : (
              <ProgressAwardsStats
                gold={shelf.medals.gold}
                silver={shelf.medals.silver}
                bronze={shelf.medals.bronze}
                cups={shelf.cupStats ? shelf.cupStats.cups : null}
                lessonBadgesEarned={shelf.lessonBadgesEarned}
                lessonBadgesSummary={copy.lessonBadgesSummary}
                ariaLabel={awardsSummary ?? ''}
              />
            )}
          </div>
          <div className={STATUS_INSET_EXPAND_WRAP}>
            <button
              type="button"
              className={STATUS_INSET_EXPAND_BTN}
              aria-label={copy.awardsOpenAria}
              onClick={() => launch({ kind: 'detail', detail: 'awards' }, 'awards')}
            >
              <span className="min-w-0 break-words">{copy.awardsOpen}</span>
            </button>
          </div>
        </div>
      </ProgressCard>

      {activeDays.length > 0 ? (
        <ProgressCard
          title={copy.calendarTitle}
          footer={
            <ProgressFooterButton
              variant={todayActive ? 'expand' : 'launch'}
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
                attentionZones[0]?.lessonId && attentionZones[0].chipActive ? 'launch' : 'expand'
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
        <p className="break-words text-[13px] leading-snug text-[var(--text-muted)]">{copy.balanceRubySoon}</p>
        <p className="break-words text-[13px] leading-snug text-[var(--text-muted)]">{copy.balanceDiamondSoon}</p>
      </ProgressCard>
    </div>
  )

  const awardsDetail = (
    <div className="w-full min-w-0 space-y-2.5">
      <ProgressCard title={copy.awardsTitle}>
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
          practiceBusy={practiceBusy}
          onToggle={(lessonId) =>
            setExpandedLessonId((cur) => toggleTopicAwardExpanded(cur, lessonId))
          }
          onLaunch={(target) => void onLaunchTarget?.(target)}
        />
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
      showChatWallpaper={false}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} py-2.5 sm:py-3`}
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
      {body}
    </LessonReadingShell>
  )
}
