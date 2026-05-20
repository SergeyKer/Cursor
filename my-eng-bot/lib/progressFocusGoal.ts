import type { ModeGoalId, RewardsState } from '@/lib/rewardsState'

export type FocusModeGoal = {
  mode: ModeGoalId
  label: string
  goalProgress: number
  goalTarget: number
}

export function pickFocusModeGoal(state: RewardsState | undefined): FocusModeGoal | null {
  if (!state) return null
  const modes: ModeGoalId[] = ['communication', 'engvo']
  for (const mode of modes) {
    const goal = state.modeGoals[mode]
    if (goal?.status === 'in_progress' && !goal.completed) {
      return {
        mode,
        label: mode === 'communication' ? 'Общение' : 'Звонок',
        goalProgress: goal.goalProgress,
        goalTarget: goal.goalTarget,
      }
    }
  }
  for (const mode of modes) {
    const goal = state.modeGoals[mode]
    if (goal && (goal.status === 'not_started' || goal.status === 'abandoned')) {
      return {
        mode,
        label: mode === 'communication' ? 'Общение' : 'Звонок',
        goalProgress: goal.goalProgress,
        goalTarget: goal.goalTarget,
      }
    }
  }
  const communication = state.modeGoals.communication
  return {
    mode: 'communication',
    label: 'Общение',
    goalProgress: communication.goalProgress,
    goalTarget: communication.goalTarget,
  }
}
