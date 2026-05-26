import { DAILY_STREAK_GLYPH, formatDailyStreakFooter } from '@/lib/gamificationGlyphs'
import { resolveStreakDailyBonus } from '@/lib/streakDailyBonus'

export const REWARDS_STATE_KEY = 'myeng_state_v1'
const REWARDS_STATE_VERSION = '1.0'
const XP_PER_LEVEL = 100

export type ModeGoalId = 'communication' | 'engvo'
export type ModeGoalStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

export interface ModeGoalState {
  goalTarget: number
  goalProgress: number
  completed: boolean
  status: ModeGoalStatus
  sessionStartedAt: string | null
  sessionCompletedAt: string | null
  estimatedDurationMinutes?: number
  assigned?: boolean
}

export interface RewardsProfileState {
  name: string
  englishLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'not_set'
  registrationDate: string
  preferences: {
    language: 'ru' | 'en'
    notifications: boolean
    theme: 'default' | 'futuristic' | 'minimal'
  }
}

export interface GlobalProgressState {
  totalXP: number
  level: number
  currentLevelXP: number
  xpToNextLevel: number
  dailyStreak: number
  bestDailyStreak: number
  lastActiveDate: string | null
  lastStreakDailyBonusDate: string | null
}

export interface RewardsCurrenciesState {
  coins: number
  gems: number
  tickets: number
}

export interface LastRewardState {
  amount: number
  reason: string
  at: string
  streakBonus?: number
  dailyStreakAtAward?: number
}

export interface RewardUiState {
  footerTicker: string
  lastReward: LastRewardState | null
  lastLevelUp: {
    from: number
    to: number
    at: string
  } | null
}

export interface RewardsState {
  version: string
  timestamp: string
  profile: RewardsProfileState
  progress: GlobalProgressState
  currencies: RewardsCurrenciesState
  modeGoals: Record<ModeGoalId, ModeGoalState>
  ui: RewardUiState
}

const MODE_GOAL_SESSION_TTL_MS = 45 * 60 * 1000

export function getTodayDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function calculateLevel(totalXP: number): Pick<GlobalProgressState, 'level' | 'currentLevelXP' | 'xpToNextLevel'> {
  const safeXp = Number.isFinite(totalXP) ? Math.max(0, Math.floor(totalXP)) : 0
  return {
    level: Math.floor(safeXp / XP_PER_LEVEL) + 1,
    currentLevelXP: safeXp % XP_PER_LEVEL,
    xpToNextLevel: XP_PER_LEVEL,
  }
}

function createDefaultGoal(goalTarget: number, estimatedDurationMinutes: number): ModeGoalState {
  return {
    goalTarget,
    goalProgress: 0,
    completed: false,
    status: 'not_started',
    sessionStartedAt: null,
    sessionCompletedAt: null,
    estimatedDurationMinutes,
    assigned: false,
  }
}

export function createDefaultRewardsState(): RewardsState {
  const today = getTodayDateString()
  return {
    version: REWARDS_STATE_VERSION,
    timestamp: new Date().toISOString(),
    profile: {
      name: '',
      englishLevel: 'not_set',
      registrationDate: today,
      preferences: {
        language: 'ru',
        notifications: true,
        theme: 'default',
      },
    },
    progress: {
      totalXP: 0,
      level: 1,
      currentLevelXP: 0,
      xpToNextLevel: XP_PER_LEVEL,
      dailyStreak: 0,
      bestDailyStreak: 0,
      lastActiveDate: null,
      lastStreakDailyBonusDate: null,
    },
    currencies: {
      coins: 0,
      gems: 0,
      tickets: 0,
    },
    modeGoals: {
      communication: createDefaultGoal(7, 4),
      engvo: createDefaultGoal(7, 5),
    },
    ui: {
      footerTicker: 'Готов к следующему шагу.',
      lastReward: null,
      lastLevelUp: null,
    },
  }
}

function parseDateOrNull(value: string | null): Date | null {
  if (!value) return null
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function daysBetweenDates(fromDate: string, toDate: string): number {
  const from = parseDateOrNull(fromDate)
  const to = parseDateOrNull(toDate)
  if (!from || !to) return 0
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / msPerDay)
}

function normalizeModeGoal(raw: unknown, fallback: ModeGoalState): ModeGoalState {
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<ModeGoalState>
  const goalTarget = typeof src.goalTarget === 'number' ? Math.max(1, Math.floor(src.goalTarget)) : fallback.goalTarget
  const goalProgress = typeof src.goalProgress === 'number' ? Math.max(0, Math.floor(src.goalProgress)) : fallback.goalProgress
  const completed = Boolean(src.completed) || goalProgress >= goalTarget
  const status: ModeGoalStatus = completed
    ? 'completed'
    : src.status === 'in_progress' || src.status === 'abandoned' || src.status === 'not_started'
      ? src.status
      : fallback.status
  return {
    goalTarget,
    goalProgress: Math.min(goalProgress, goalTarget),
    completed,
    status,
    sessionStartedAt: typeof src.sessionStartedAt === 'string' ? src.sessionStartedAt : fallback.sessionStartedAt,
    sessionCompletedAt: typeof src.sessionCompletedAt === 'string' ? src.sessionCompletedAt : completed ? new Date().toISOString() : null,
    estimatedDurationMinutes:
      typeof src.estimatedDurationMinutes === 'number' ? Math.max(1, Math.floor(src.estimatedDurationMinutes)) : fallback.estimatedDurationMinutes,
    assigned: typeof src.assigned === 'boolean' ? src.assigned : fallback.assigned,
  }
}

function normalizeRewardsState(raw: unknown): RewardsState {
  const fallback = createDefaultRewardsState()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<RewardsState>
  const totalXP = typeof src.progress?.totalXP === 'number' ? Math.max(0, Math.floor(src.progress.totalXP)) : 0
  const levelView = calculateLevel(totalXP)
  const dailyStreak =
    typeof src.progress?.dailyStreak === 'number' ? Math.max(0, Math.floor(src.progress.dailyStreak)) : fallback.progress.dailyStreak
  const storedBest =
    typeof src.progress?.bestDailyStreak === 'number' ? Math.max(0, Math.floor(src.progress.bestDailyStreak)) : 0
  const bestDailyStreak = Math.max(storedBest, dailyStreak)
  const normalized: RewardsState = {
    version: REWARDS_STATE_VERSION,
    timestamp: typeof src.timestamp === 'string' ? src.timestamp : new Date().toISOString(),
    profile: {
      name: typeof src.profile?.name === 'string' ? src.profile.name : '',
      englishLevel:
        src.profile?.englishLevel === 'A1' ||
        src.profile?.englishLevel === 'A2' ||
        src.profile?.englishLevel === 'B1' ||
        src.profile?.englishLevel === 'B2' ||
        src.profile?.englishLevel === 'C1' ||
        src.profile?.englishLevel === 'C2'
          ? src.profile.englishLevel
          : 'not_set',
      registrationDate: typeof src.profile?.registrationDate === 'string' ? src.profile.registrationDate : fallback.profile.registrationDate,
      preferences: {
        language: src.profile?.preferences?.language === 'en' ? 'en' : 'ru',
        notifications: src.profile?.preferences?.notifications !== false,
        theme:
          src.profile?.preferences?.theme === 'futuristic' || src.profile?.preferences?.theme === 'minimal'
            ? src.profile.preferences.theme
            : 'default',
      },
    },
    progress: {
      totalXP,
      level: levelView.level,
      currentLevelXP: levelView.currentLevelXP,
      xpToNextLevel: levelView.xpToNextLevel,
      dailyStreak,
      bestDailyStreak,
      lastActiveDate:
        typeof src.progress?.lastActiveDate === 'string' ? src.progress.lastActiveDate : fallback.progress.lastActiveDate,
      lastStreakDailyBonusDate:
        typeof src.progress?.lastStreakDailyBonusDate === 'string'
          ? src.progress.lastStreakDailyBonusDate
          : fallback.progress.lastStreakDailyBonusDate,
    },
    currencies: {
      coins: typeof src.currencies?.coins === 'number' ? Math.max(0, Math.floor(src.currencies.coins)) : 0,
      gems: typeof src.currencies?.gems === 'number' ? Math.max(0, Math.floor(src.currencies.gems)) : 0,
      tickets: typeof src.currencies?.tickets === 'number' ? Math.max(0, Math.floor(src.currencies.tickets)) : 0,
    },
    modeGoals: {
      communication: normalizeModeGoal(src.modeGoals?.communication, fallback.modeGoals.communication),
      engvo: normalizeModeGoal(src.modeGoals?.engvo, fallback.modeGoals.engvo),
    },
    ui: {
      footerTicker: typeof src.ui?.footerTicker === 'string' ? src.ui.footerTicker : fallback.ui.footerTicker,
      lastReward:
        src.ui?.lastReward &&
        typeof src.ui.lastReward.amount === 'number' &&
        typeof src.ui.lastReward.reason === 'string' &&
        typeof src.ui.lastReward.at === 'string'
          ? {
              amount: src.ui.lastReward.amount,
              reason: src.ui.lastReward.reason,
              at: src.ui.lastReward.at,
            }
          : null,
      lastLevelUp:
        src.ui?.lastLevelUp &&
        typeof src.ui.lastLevelUp.from === 'number' &&
        typeof src.ui.lastLevelUp.to === 'number' &&
        typeof src.ui.lastLevelUp.at === 'string'
          ? {
              from: Math.max(1, Math.floor(src.ui.lastLevelUp.from)),
              to: Math.max(1, Math.floor(src.ui.lastLevelUp.to)),
              at: src.ui.lastLevelUp.at,
            }
          : null,
    },
  }
  return reconcileModeGoalSessions(normalized)
}

export function loadRewardsState(): RewardsState {
  if (typeof window === 'undefined') return createDefaultRewardsState()
  try {
    const raw = localStorage.getItem(REWARDS_STATE_KEY)
    if (!raw) return createDefaultRewardsState()
    return normalizeRewardsState(JSON.parse(raw))
  } catch {
    return createDefaultRewardsState()
  }
}

export function saveRewardsState(state: RewardsState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      REWARDS_STATE_KEY,
      JSON.stringify({
        ...state,
        version: REWARDS_STATE_VERSION,
        timestamp: new Date().toISOString(),
      } satisfies RewardsState)
    )
  } catch {
    // ignore storage failures
  }
}

export function withDailyActivity(state: RewardsState, today: string = getTodayDateString()): RewardsState {
  const last = state.progress.lastActiveDate
  if (last === today) return state
  const diffDays = last ? daysBetweenDates(last, today) : 0
  const nextStreak = !last ? 1 : diffDays === 1 ? state.progress.dailyStreak + 1 : 1
  const dailyStreak = Math.max(1, nextStreak)
  const bestDailyStreak = Math.max(state.progress.bestDailyStreak ?? dailyStreak, dailyStreak)
  return {
    ...state,
    progress: {
      ...state.progress,
      dailyStreak,
      bestDailyStreak,
      lastActiveDate: today,
    },
  }
}

export function awardGlobalXp(
  state: RewardsState,
  amount: number,
  reason: string,
  options?: { ticker?: string; countsAsDailyActivity?: boolean; today?: string }
): RewardsState {
  const safeAmount = Math.max(0, Math.floor(amount))
  if (safeAmount <= 0) return state
  const today = options?.today ?? getTodayDateString()
  let nextState = state
  if (options?.countsAsDailyActivity !== false) {
    nextState = withDailyActivity(nextState, today)
  }
  const { bonus: streakBonus, nextLastStreakDailyBonusDate } = resolveStreakDailyBonus(nextState, today)
  const totalAward = safeAmount + streakBonus
  const totalXP = nextState.progress.totalXP + totalAward
  const levelView = calculateLevel(totalXP)
  const defaultTicker =
    streakBonus > 0
      ? `+${totalAward} XP (в т.ч. +${streakBonus} за серию).`
      : `+${safeAmount} XP. Отличный шаг вперёд.`
  const ticker = options?.ticker ?? defaultTicker
  const leveledUp = levelView.level > nextState.progress.level
  const rewardAt = new Date().toISOString()
  return {
    ...nextState,
    progress: {
      ...nextState.progress,
      totalXP,
      level: levelView.level,
      currentLevelXP: levelView.currentLevelXP,
      xpToNextLevel: levelView.xpToNextLevel,
      lastStreakDailyBonusDate:
        streakBonus > 0 ? nextLastStreakDailyBonusDate : nextState.progress.lastStreakDailyBonusDate,
    },
    ui: {
      ...nextState.ui,
      footerTicker: ticker,
      lastReward: {
        amount: totalAward,
        reason,
        at: rewardAt,
        ...(streakBonus > 0
          ? {
              streakBonus,
              dailyStreakAtAward: nextState.progress.dailyStreak,
            }
          : {}),
      },
      lastLevelUp: leveledUp
        ? {
            from: nextState.progress.level,
            to: levelView.level,
            at: rewardAt,
          }
        : nextState.ui.lastLevelUp,
    },
  }
}

function resolveGoalSessionExpiry(goal: ModeGoalState, nowTs: number): boolean {
  if (goal.status !== 'in_progress') return false
  const started = parseDateOrNull(goal.sessionStartedAt)
  if (!started) return false
  return nowTs - started.getTime() > MODE_GOAL_SESSION_TTL_MS
}

function abandonGoalSession(goal: ModeGoalState): ModeGoalState {
  return {
    ...goal,
    status: 'abandoned',
    completed: false,
    goalProgress: 0,
    sessionStartedAt: null,
    sessionCompletedAt: null,
  }
}

export function reconcileModeGoalSessions(state: RewardsState, now: Date = new Date()): RewardsState {
  const nowTs = now.getTime()
  let changed = false
  const nextGoals = (Object.keys(state.modeGoals) as ModeGoalId[]).reduce<Record<ModeGoalId, ModeGoalState>>(
    (acc, mode) => {
      const existing = state.modeGoals[mode]
      if (resolveGoalSessionExpiry(existing, nowTs)) {
        changed = true
        acc[mode] = abandonGoalSession(existing)
      } else {
        acc[mode] = existing
      }
      return acc
    },
    {} as Record<ModeGoalId, ModeGoalState>
  )
  if (!changed) return state
  return {
    ...state,
    modeGoals: nextGoals,
  }
}

export function incrementModeGoal(
  state: RewardsState,
  mode: ModeGoalId,
  options?: { progressXp?: number; completionXp?: number; tickerOnProgress?: string; tickerOnComplete?: string }
): RewardsState {
  const lifecycleState = reconcileModeGoalSessions(state)
  const existing = lifecycleState.modeGoals[mode]
  const shouldStartNewSession =
    existing.status === 'not_started' || existing.status === 'abandoned' || existing.completed
  const inProgress: ModeGoalState = shouldStartNewSession
    ? {
        ...existing,
        goalProgress: 0,
        completed: false,
        status: 'in_progress',
        sessionStartedAt: new Date().toISOString(),
        sessionCompletedAt: null,
      }
    : existing

  const nextProgress = Math.min(inProgress.goalTarget, inProgress.goalProgress + 1)
  const completedNow = !inProgress.completed && nextProgress >= inProgress.goalTarget
  let nextState: RewardsState = {
    ...lifecycleState,
    modeGoals: {
      ...lifecycleState.modeGoals,
      [mode]: {
        ...inProgress,
        goalProgress: nextProgress,
        completed: completedNow || inProgress.completed,
        status: completedNow ? 'completed' : 'in_progress',
        sessionCompletedAt: completedNow ? new Date().toISOString() : inProgress.sessionCompletedAt,
      },
    },
  }

  if (completedNow) {
    const rewardAmount = (options?.progressXp ?? 5) + (options?.completionXp ?? 35)
    nextState = awardGlobalXp(nextState, rewardAmount, `${mode}_goal_completed`, {
      ticker:
        options?.tickerOnComplete ??
        (mode === 'communication'
          ? 'Цель общения 7/7 выполнена. Отличная работа.'
          : 'Цель звонка 7/7 выполнена. Отличная работа.'),
    })
    return nextState
  }

  const progressTicker =
    options?.tickerOnProgress ??
    (mode === 'communication'
      ? `Ответы ${nextProgress}/${inProgress.goalTarget}. Продолжай!`
      : `Реплики ${nextProgress}/${inProgress.goalTarget}. Почти цель.`)
  return awardGlobalXp(nextState, options?.progressXp ?? 5, `${mode}_goal_progress`, {
    ticker: progressTicker,
  })
}

export function formatGlobalFooterStats(state: RewardsState): string {
  return `⭐${state.progress.totalXP} | ${formatDailyStreakFooter(state.progress.dailyStreak)} | 🪙${state.currencies.coins} | 💎${state.currencies.gems} | 🎫${state.currencies.tickets}`
}

export function formatCompactFooterStats(state: RewardsState): string {
  return `⭐${state.progress.totalXP} | ${formatDailyStreakFooter(state.progress.dailyStreak)}`
}

export function formatModeGoalFooter(mode: ModeGoalId, state: RewardsState): string {
  const goal = state.modeGoals[mode]
  const label = mode === 'communication' ? 'Ответы' : 'Реплики'
  return `${label} ${goal.goalProgress}/${goal.goalTarget} | ⭐${state.progress.totalXP} | ${formatDailyStreakFooter(state.progress.dailyStreak)}`
}

export function appendFooterRewardSnapshot(baseText: string | null | undefined, state: RewardsState): string {
  const context = typeof baseText === 'string' ? baseText.trim() : ''
  const compact = formatCompactFooterStats(state)
  if (!context) return compact
  if (context.includes('⭐') && context.includes(DAILY_STREAK_GLYPH)) return context
  return `${context} | ${compact}`
}
