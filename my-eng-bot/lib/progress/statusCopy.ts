import { pickFocusModeGoal, type FocusModeGoal } from '@/lib/progressFocusGoal'
import type { PracticeRewardOpportunity } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import {
  getTodayDateString,
  type ModeGoalId,
  type ModeGoalState,
  type RewardsState,
} from '@/lib/rewardsState'
import { streakDailyBonusXp } from '@/lib/streakDailyBonus'
import { daysBetweenCalendarDates, isStreakExpired } from '@/lib/streakStatus'
import { getLessonTopicById } from '@/lib/lessonCatalog'
import {
  compactOpportunityTopicLabel,
  formatOpportunityBodyLine,
  formatOpportunityTitle,
  type ProgressAudience,
  type ProgressCopy,
} from '@/lib/uiCopy/progress'
import { ruDayWord } from '@/lib/uiCopy/myPlan'

export type ModeGoalStatusLine = {
  mode: ModeGoalId
  label: string
  progress: number
  target: number
  statusLabel: string
  assigned: boolean
  estimatedDurationMinutes: number | null
  line: string
}

export type ProgressStatusCopy = {
  streakStatusLine: string
  streakStatusHeadline: string
  streakStatusBody: string
  streakCtaLabel: string
  /** Warning frame: series still recoverable (last active yesterday). */
  streakRecoverable: boolean
  streakExpired: boolean
  /** @deprecated Use streakRecoverable for warning UI. Same as streakRecoverable. */
  streakAtRisk: boolean
  streakEmpty: boolean
  activeToday: boolean
  modeGoals: ModeGoalStatusLine[]
  focusGoal: FocusModeGoal | null
  focusPercent: number
  opportunity: {
    frame: string
    title: string
    /** Alias of title for existing callers. */
    label: string
    reasonLine: string
    ctaLabel: string
  } | null
}

function modeStatusLabel(goal: ModeGoalState | undefined, copy: ProgressCopy): string {
  if (!goal) return copy.statusNotStarted
  if (goal.status === 'completed') return copy.statusCompleted
  if (goal.status === 'in_progress') return copy.statusInProgress
  if (goal.status === 'abandoned') return copy.statusAbandoned
  return copy.statusNotStarted
}

function daysPhrase(n: number): string {
  return `${n} ${ruDayWord(n)}`
}

function remainingToBonusPhrase(k: number): string {
  if (k <= 1) return `остался 1 день`
  return `осталось ${daysPhrase(k)}`
}

function streakParts(
  headline: string,
  body: string,
  streakCtaLabel: string
): { streakStatusLine: string; streakStatusHeadline: string; streakStatusBody: string; streakCtaLabel: string } {
  return {
    streakStatusHeadline: headline,
    streakStatusBody: body,
    streakStatusLine: `${headline} ${body}`.trim(),
    streakCtaLabel,
  }
}

function buildStreakLineAndCta(params: {
  audience: ProgressAudience
  dailyStreak: number
  bestDailyStreak: number
  activeToday: boolean
  streakEmpty: boolean
  streakRecoverable: boolean
  streakExpired: boolean
}): { streakStatusLine: string; streakStatusHeadline: string; streakStatusBody: string; streakCtaLabel: string } {
  const child = params.audience === 'child'
  const n = Math.max(0, Math.floor(params.dailyStreak))
  const r = Math.max(n, Math.floor(params.bestDailyStreak))
  const x = streakDailyBonusXp(n)
  const k = Math.max(1, 3 - n)

  if (params.streakEmpty) {
    return streakParts(
      'Первый шаг — самый важный.',
      child
        ? 'Начни сейчас: через 3 дня подряд откроется +10 XP.'
        : 'Начните сейчас: через 3 дня подряд откроется +10 XP.',
      'Начать'
    )
  }

  if (params.streakRecoverable) {
    if (n < 3) {
      return streakParts(
        `Отличный старт — серия ${daysPhrase(n)}!`,
        child
          ? 'Продолжи сегодня: с 3 дней подряд первый шаг даёт +10 XP.'
          : 'Продолжите сегодня: с 3 дней подряд первый шаг даёт +10 XP.',
        'Сохранить серию'
      )
    }
    return streakParts(
      `Отличная серия — ${daysPhrase(n)}!`,
      child
        ? `Продолжи сегодня и сохрани ежедневный бонус +${x} XP.`
        : `Продолжите сегодня и сохраните ежедневный бонус +${x} XP.`,
      'Сохранить серию'
    )
  }

  if (params.activeToday) {
    if (n < 3) {
      return streakParts(
        child ? `Молодец, серия уже ${daysPhrase(n)}!` : `Отлично, серия уже ${daysPhrase(n)}!`,
        child
          ? `Продолжай сейчас, а завтра возвращайся — до +10 XP ${remainingToBonusPhrase(k)}.`
          : `Продолжайте сейчас, а завтра возвращайтесь — до +10 XP ${remainingToBonusPhrase(k)}.`,
        'Продолжить'
      )
    }
    return streakParts(
      `Отлично, серия ${daysPhrase(n)} открывает +${x} XP к первому шагу дня.`,
      child
        ? 'Продолжай сейчас, а завтра возвращайся за бонусом.'
        : 'Продолжайте сейчас, а завтра возвращайтесь за бонусом.',
      'Продолжить'
    )
  }

  if (params.streakExpired) {
    const recordLine =
      !child && r >= 3 ? ` Лучший результат был ${daysPhrase(r)}.` : ''
    return streakParts(
      child ? 'Занимайся 3 дня подряд' : 'Начните снова сегодня',
      child
        ? 'Сегодня — первый день. 3 дня подряд — и каждый день +10 очков.'
        : `3 дня подряд — снова +10 XP.${recordLine}`,
      child ? 'Заниматься сегодня' : 'К занятиям'
    )
  }

  return streakParts(
    'Первый шаг — самый важный.',
    child
      ? 'Начни сейчас: через 3 дня подряд откроется +10 XP.'
      : 'Начните сейчас: через 3 дня подряд откроется +10 XP.',
    'Начать'
  )
}

function buildOpportunityStatusCopy(
  opportunity: PracticeRewardOpportunity,
  copy: ProgressCopy,
  audience: ProgressAudience,
  cupsEnabled: boolean
): NonNullable<ProgressStatusCopy['opportunity']> {
  const showGoldMedal = opportunity.medal === 'gold' || opportunity.reason === 'gold_ring'
  const topicLabel = compactOpportunityTopicLabel(
    getLessonTopicById(opportunity.lessonId)?.title,
    opportunity.topic
  )
  const title = formatOpportunityTitle(topicLabel, showGoldMedal)
  return {
    frame: copy.nearRewardTitle,
    title,
    label: title,
    reasonLine: formatOpportunityBodyLine(
      opportunity.reason,
      audience,
      cupsEnabled,
      opportunity.ringCount
    ),
    ctaLabel: opportunity.ringCount > 0 ? copy.continuePractice : copy.startPractice,
  }
}

export function buildProgressStatusCopy(params: {
  rewardsState: RewardsState | undefined
  copy: ProgressCopy
  audience: ProgressAudience
  cupsEnabled: boolean
  opportunity: PracticeRewardOpportunity | null
  today?: string
}): ProgressStatusCopy {
  const today = params.today ?? getTodayDateString()
  const state = params.rewardsState
  const dailyStreak = state?.progress.dailyStreak ?? 0
  const bestDailyStreak = state?.progress.bestDailyStreak ?? dailyStreak
  const lastActive = state?.progress.lastActiveDate ?? null
  const activeToday = lastActive === today
  const streakEmpty = dailyStreak <= 0
  const daysSinceLast = lastActive ? daysBetweenCalendarDates(lastActive, today) : null
  const streakRecoverable = !streakEmpty && !activeToday && daysSinceLast === 1
  const streakExpired = isStreakExpired(state, today)
  const streakAtRisk = streakRecoverable

  const { streakStatusLine, streakStatusHeadline, streakStatusBody, streakCtaLabel } =
    buildStreakLineAndCta({
      audience: params.audience,
      dailyStreak,
      bestDailyStreak,
      activeToday,
      streakEmpty,
      streakRecoverable,
      streakExpired,
    })

  const modes: ModeGoalId[] = ['communication', 'engvo']
  const modeGoals: ModeGoalStatusLine[] = modes.map((mode) => {
    const goal = state?.modeGoals[mode]
    const label = mode === 'communication' ? params.copy.modeCommunication : params.copy.modeEngvo
    const session = mode === 'communication' ? state?.communicationSession : null
    const progress =
      mode === 'communication' && session
        ? session.progress
        : (goal?.goalProgress ?? 0)
    const target =
      mode === 'communication' && session
        ? session.target || 8
        : (goal?.goalTarget ?? 7)
    const statusLabel =
      mode === 'communication' && session
        ? session.status === 'completed'
          ? params.copy.statusCompleted
          : session.status === 'in_progress'
            ? params.copy.statusInProgress
            : session.status === 'abandoned'
              ? params.copy.statusAbandoned
              : params.copy.statusNotStarted
        : modeStatusLabel(goal, params.copy)
    const line =
      params.audience === 'child'
        ? `${label} ${progress} из ${target}`
        : `${label}: ${progress}/${target}`
    return {
      mode,
      label,
      progress,
      target,
      statusLabel,
      assigned: Boolean(goal?.assigned),
      estimatedDurationMinutes:
        typeof goal?.estimatedDurationMinutes === 'number' ? goal.estimatedDurationMinutes : null,
      line,
    }
  })

  const focusGoal = pickFocusModeGoal(state)
  const focusPercent =
    focusGoal && focusGoal.goalTarget > 0
      ? Math.min(100, Math.round((focusGoal.goalProgress / focusGoal.goalTarget) * 100))
      : 0

  const opportunity = params.opportunity
    ? buildOpportunityStatusCopy(
        params.opportunity,
        params.copy,
        params.audience,
        params.cupsEnabled
      )
    : null

  return {
    streakStatusLine,
    streakStatusHeadline,
    streakStatusBody,
    streakCtaLabel,
    streakRecoverable,
    streakExpired,
    streakAtRisk,
    streakEmpty,
    activeToday,
    modeGoals,
    focusGoal,
    focusPercent,
    opportunity,
  }
}
