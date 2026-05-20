import { awardGlobalXp, incrementModeGoal, type RewardsState } from './rewardsState'

export type RewardsEvent =
  | { type: 'lesson_xp_awarded'; amount: number }
  | { type: 'practice_completed' }
  | { type: 'accent_block_completed' }
  | { type: 'accent_session_completed' }
  | { type: 'communication_turn_completed' }
  | { type: 'engvo_turn_completed' }

export function applyRewardsEvent(state: RewardsState, event: RewardsEvent): RewardsState {
  switch (event.type) {
    case 'lesson_xp_awarded': {
      const amount = Math.max(0, Math.floor(event.amount))
      if (amount <= 0) return state
      return awardGlobalXp(state, amount, event.type, {
        ticker: `+${amount} XP к уровню.`,
      })
    }
    case 'practice_completed':
      return awardGlobalXp(state, 30, event.type, {
        ticker: 'Практика завершена. +30 XP за закрытую сессию.',
      })
    case 'accent_block_completed':
      return awardGlobalXp(state, 15, event.type, {
        ticker: 'Блок произношения закрыт. +15 XP.',
      })
    case 'accent_session_completed':
      return awardGlobalXp(state, 30, event.type, {
        ticker: 'Сессия произношения завершена. +30 XP.',
      })
    case 'communication_turn_completed':
      return incrementModeGoal(state, 'communication', {
        completionXp: 35,
      })
    case 'engvo_turn_completed':
      return incrementModeGoal(state, 'engvo', {
        completionXp: 35,
      })
    default:
      return state
  }
}
