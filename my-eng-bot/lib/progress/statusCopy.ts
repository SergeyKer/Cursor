import { pickFocusModeGoal, type FocusModeGoal } from '@/lib/progressFocusGoal'
import type { PracticeRewardOpportunity } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import {
  getTodayDateString,
  type ModeGoalId,
  type ModeGoalState,
  type RewardsState,
} from '@/lib/rewardsState'
import type { ProgressAudience, ProgressCopy } from '@/lib/uiCopy/progress'
import { progressOpportunityReason } from '@/lib/uiCopy/progress'

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
  streakAtRisk: boolean
  streakEmpty: boolean
  activeToday: boolean
  modeGoals: ModeGoalStatusLine[]
  focusGoal: FocusModeGoal | null
  focusPercent: number
  opportunity: {
    label: string
    reasonLine: string
  } | null
}

function modeStatusLabel(goal: ModeGoalState | undefined, copy: ProgressCopy): string {
  if (!goal) return copy.statusNotStarted
  if (goal.status === 'completed') return copy.statusCompleted
  if (goal.status === 'in_progress') return copy.statusInProgress
  if (goal.status === 'abandoned') return copy.statusAbandoned
  return copy.statusNotStarted
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
  const activeToday = state?.progress.lastActiveDate === today
  const streakEmpty = dailyStreak <= 0
  const streakAtRisk = dailyStreak > 0 && !activeToday

  let streakStatusLine: string
  if (streakEmpty) {
    streakStatusLine =
      params.audience === 'child' ? '0 дней. Начни сегодня!' : '0 дней. Начните сегодня!'
  } else if (activeToday) {
    streakStatusLine =
      params.audience === 'child'
        ? 'Серия на сегодня уже есть.'
        : 'Серия дней на сегодня зафиксирована.'
  } else {
    streakStatusLine =
      params.audience === 'child'
        ? 'Серия под угрозой — закрой цель сегодня!'
        : 'Серия под угрозой — закройте хотя бы одну цель сегодня.'
  }

  const modes: ModeGoalId[] = ['communication', 'engvo']
  const modeGoals: ModeGoalStatusLine[] = modes.map((mode) => {
    const goal = state?.modeGoals[mode]
    const label = mode === 'communication' ? params.copy.modeCommunication : params.copy.modeEngvo
    const progress = goal?.goalProgress ?? 0
    const target = goal?.goalTarget ?? 7
    const statusLabel = modeStatusLabel(goal, params.copy)
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
    ? {
        label: params.opportunity.label,
        reasonLine: progressOpportunityReason(
          params.opportunity.reason,
          params.audience,
          params.cupsEnabled
        ),
      }
    : null

  return {
    streakStatusLine,
    streakAtRisk,
    streakEmpty,
    activeToday,
    modeGoals,
    focusGoal,
    focusPercent,
    opportunity,
  }
}
