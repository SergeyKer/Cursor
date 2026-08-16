import { DAILY_STREAK_GLYPH, formatDailyStreakFooter } from '@/lib/gamificationGlyphs'
import {
  calculateLevelFromTotalXp,
  normalizeTotalXp,
  xpBarForLevel,
} from '@/lib/levelCurve'
import { resolveStreakDailyBonus } from '@/lib/streakDailyBonus'
import {
  DIALOGUE_SESSION_LENGTH,
  DIALOGUE_SESSION_TTL_MS,
  createDefaultDialogueSession,
  type DialogueSessionState,
} from '@/lib/dialogue/dialogueSessionEconomy'
import {
  COMMUNICATION_SESSION_LENGTH,
  COMMUNICATION_SESSION_TTL_MS,
  createDefaultCommunicationSession,
  type CommunicationSessionState,
} from '@/lib/communication/communicationSessionEconomy'
import {
  TRANSLATION_SESSION_LENGTH,
  TRANSLATION_SESSION_TTL_MS,
  createDefaultTranslationSession,
  type TranslationSessionState,
} from '@/lib/translation/translationSessionEconomy'
import {
  TUTOR_SESSION_TTL_MS,
  abandonTutorSessionSlice,
  createDefaultTutorSession,
  normalizeTutorKeyList,
  rollTutorDailyXp,
  type TutorSessionState,
} from '@/lib/tutor/tutorSessionEconomy'

export const REWARDS_STATE_KEY = 'myeng_state_v1'
export const REWARDS_MIGRATIONS_KEY = 'myeng_rewards_migrations_v1'
const REWARDS_STATE_VERSION = '1.0'

/** Стартовый бонус монет (новые пользователи + одноразовая миграция существующих). */
export const STARTER_COINS_BONUS = 10

/** Одноразовая раздача монет всем с сохранённым прогрессом. */
export const GLOBAL_COINS_GRANT_AMOUNT = 10

type RewardsMigrations = {
  starterCoinsBonusV1?: boolean
  globalCoinsGrantV1?: boolean
  zeroCoinsTopUpV1?: boolean
}

function canUseRewardsStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined'
}

function readRewardsMigrations(): RewardsMigrations {
  if (!canUseRewardsStorage()) return {}
  try {
    const raw = globalThis.localStorage.getItem(REWARDS_MIGRATIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as RewardsMigrations
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeRewardsMigrations(migrations: RewardsMigrations): void {
  if (!canUseRewardsStorage()) return
  try {
    globalThis.localStorage.setItem(REWARDS_MIGRATIONS_KEY, JSON.stringify(migrations))
  } catch {
    // ignore storage failures
  }
}

/** Одноразовый стартовый бонус 🪙 для пользователей с уже сохранённым прогрессом. */
export function applyStarterCoinsBonusMigration(state: RewardsState): RewardsState {
  const migrations = readRewardsMigrations()
  if (migrations.starterCoinsBonusV1) return state
  writeRewardsMigrations({ ...migrations, starterCoinsBonusV1: true })
  return {
    ...state,
    currencies: {
      ...state.currencies,
      coins: state.currencies.coins + STARTER_COINS_BONUS,
    },
  }
}

/** Одноразовая раздача 🪙 всем пользователям с сохранённым прогрессом. */
export function applyGlobalCoinsGrantMigration(state: RewardsState): RewardsState {
  const migrations = readRewardsMigrations()
  if (migrations.globalCoinsGrantV1) return state
  writeRewardsMigrations({ ...migrations, globalCoinsGrantV1: true })
  return {
    ...state,
    currencies: {
      ...state.currencies,
      coins: state.currencies.coins + GLOBAL_COINS_GRANT_AMOUNT,
    },
  }
}

/**
 * Если после миграций баланс всё ещё 0 (флаги уже стояли, монеты потратили) -
 * один раз выставить 10 🪙.
 */
export function applyZeroCoinsTopUpMigration(state: RewardsState): RewardsState {
  const migrations = readRewardsMigrations()
  if (migrations.zeroCoinsTopUpV1) return state
  writeRewardsMigrations({ ...migrations, zeroCoinsTopUpV1: true })
  if (state.currencies.coins > 0) return state
  return {
    ...state,
    currencies: {
      ...state.currencies,
      coins: GLOBAL_COINS_GRANT_AMOUNT,
    },
  }
}

/** При каждой загрузке: пустой кошелёк → 10 🪙 (для теста forgiveness; не трогает ненулевой баланс). */
export function replenishEmptyWalletOnLoad(state: RewardsState): RewardsState {
  if (state.currencies.coins > 0) return state
  return {
    ...state,
    currencies: {
      ...state.currencies,
      coins: STARTER_COINS_BONUS,
    },
  }
}

export function applyRewardsCoinMigrations(state: RewardsState): RewardsState {
  return applyZeroCoinsTopUpMigration(applyGlobalCoinsGrantMigration(applyStarterCoinsBonusMigration(state)))
}

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
  /** ISO YYYY-MM-DD days with activity; newest kept when over cap. */
  activeDays: string[]
}

export const ACTIVE_DAYS_CAP = 120

const ACTIVE_DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeActiveDays(
  raw: unknown,
  lastActiveDate: string | null
): string[] {
  const days: string[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && ACTIVE_DAY_RE.test(item) && !days.includes(item)) {
        days.push(item)
      }
    }
  }
  if (days.length === 0 && lastActiveDate && ACTIVE_DAY_RE.test(lastActiveDate)) {
    days.push(lastActiveDate)
  }
  days.sort()
  return days.length > ACTIVE_DAYS_CAP ? days.slice(-ACTIVE_DAYS_CAP) : days
}

export function appendActiveDay(days: string[], today: string): string[] {
  if (!ACTIVE_DAY_RE.test(today)) return days
  if (days.includes(today)) return days
  const next = [...days, today]
  return next.length > ACTIVE_DAYS_CAP ? next.slice(-ACTIVE_DAYS_CAP) : next
}

export interface RewardsCurrenciesState {
  coins: number
  gems: number
  tickets: number
}

export interface CoinLedgerState {
  lessonGoldClaimed: Record<string, true>
  practiceMilestones: Record<string, true>
}

export function createDefaultCoinLedger(): CoinLedgerState {
  return { lessonGoldClaimed: {}, practiceMilestones: {} }
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
  coinLedger: CoinLedgerState
  modeGoals: Record<ModeGoalId, ModeGoalState>
  /** Сессия перевода: счётчик 8 + daily XP. Soft-default, без bump version. */
  translationSession: TranslationSessionState
  /** Сессия диалога: счётчик 8 + daily XP. Soft-default, без bump version. */
  dialogueSession: DialogueSessionState
  /** Сессия общения: счётчик 8 + daily XP. Soft-default, без bump version. */
  communicationSession: CommunicationSessionState
  /** Репетитор: daily XP + visit sessionXp. Soft-default, без bump version. */
  tutorSession: TutorSessionState
  ui: RewardUiState
}

export type {
  TranslationSessionState,
  DialogueSessionState,
  CommunicationSessionState,
  TutorSessionState,
}

const MODE_GOAL_SESSION_TTL_MS = 45 * 60 * 1000

export function getTodayDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeSessionCompletedAt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return null
  return getTodayDateString(new Date(parsed))
}

export function calculateLevel(totalXP: number): Pick<GlobalProgressState, 'level' | 'currentLevelXP' | 'xpToNextLevel'> {
  return calculateLevelFromTotalXp(totalXP)
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
      xpToNextLevel: xpBarForLevel(1),
      dailyStreak: 0,
      bestDailyStreak: 0,
      lastActiveDate: null,
      lastStreakDailyBonusDate: null,
      activeDays: [],
    },
    currencies: {
      coins: STARTER_COINS_BONUS,
      gems: 0,
      tickets: 0,
    },
    coinLedger: createDefaultCoinLedger(),
    modeGoals: {
      communication: createDefaultGoal(7, 4),
      engvo: createDefaultGoal(7, 5),
    },
    translationSession: createDefaultTranslationSession(),
    dialogueSession: createDefaultDialogueSession(),
    communicationSession: createDefaultCommunicationSession(),
    tutorSession: createDefaultTutorSession(),
    ui: {
      footerTicker: 'Готов к следующему шагу.',
      lastReward: null,
      lastLevelUp: null,
    },
  }
}

/** Placeholder для SSR-футера: без «фальшивых» 10 🪙 до загрузки localStorage. */
export function createFooterSsrPlaceholderRewardsState(): RewardsState {
  const base = createDefaultRewardsState()
  return {
    ...base,
    currencies: {
      coins: 0,
      gems: 0,
      tickets: 0,
    },
    progress: {
      ...base.progress,
      totalXP: 0,
      dailyStreak: 0,
      bestDailyStreak: 0,
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

function normalizeCoinLedger(raw: unknown): CoinLedgerState {
  const fallback = createDefaultCoinLedger()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<CoinLedgerState>
  const claimedRaw = src.lessonGoldClaimed
  const lessonGoldClaimed: Record<string, true> = {}
  if (claimedRaw && typeof claimedRaw === 'object') {
    for (const [lessonId, value] of Object.entries(claimedRaw)) {
      if (lessonId.trim() && value === true) {
        lessonGoldClaimed[lessonId] = true
      }
    }
  }
  const practiceMilestones: Record<string, true> = {}
  const practiceRaw = src.practiceMilestones
  if (practiceRaw && typeof practiceRaw === 'object') {
    for (const [milestoneKey, value] of Object.entries(practiceRaw)) {
      if (milestoneKey.trim() && value === true) {
        practiceMilestones[milestoneKey] = true
      }
    }
  }
  return { ...fallback, lessonGoldClaimed, practiceMilestones }
}

export function isLessonGoldCoinClaimed(state: RewardsState, lessonId: string): boolean {
  const id = lessonId.trim()
  if (!id) return false
  return Boolean(state.coinLedger?.lessonGoldClaimed?.[id])
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

function rollTranslationDailyXp(
  session: TranslationSessionState,
  today: string = getTodayDateString()
): TranslationSessionState {
  if (session.dailyXpDate === today) return session
  return {
    ...session,
    dailyXpAwarded: 0,
    dailyXpDate: null,
  }
}

function abandonTranslationSessionSlice(session: TranslationSessionState): TranslationSessionState {
  return {
    ...session,
    progress: 0,
    sessionXpAwarded: 0,
    status: 'abandoned',
    sessionStartedAt: null,
    completedAt: null,
    lastAwardedAssistantKey: null,
  }
}

export function normalizeTranslationSession(
  raw: unknown,
  options?: { now?: Date; today?: string }
): TranslationSessionState {
  const fallback = createDefaultTranslationSession()
  const today = options?.today ?? getTodayDateString()
  const nowTs = (options?.now ?? new Date()).getTime()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<TranslationSessionState>
  const target =
    typeof src.target === 'number' ? Math.max(1, Math.floor(src.target)) : TRANSLATION_SESSION_LENGTH
  const progress =
    typeof src.progress === 'number' ? Math.max(0, Math.min(target, Math.floor(src.progress))) : 0
  const sessionXpAwarded =
    typeof src.sessionXpAwarded === 'number' ? Math.max(0, Math.floor(src.sessionXpAwarded)) : 0
  let status: TranslationSessionState['status'] =
    src.status === 'in_progress' || src.status === 'completed' || src.status === 'not_started' || src.status === 'abandoned'
      ? src.status
      : progress >= target
        ? 'completed'
        : progress > 0
          ? 'in_progress'
          : 'not_started'
  if (progress >= target) status = 'completed'
  let session: TranslationSessionState = rollTranslationDailyXp(
    {
      target,
      progress: status === 'completed' ? target : progress,
      sessionXpAwarded: status === 'abandoned' ? 0 : sessionXpAwarded,
      status,
      sessionStartedAt: typeof src.sessionStartedAt === 'string' ? src.sessionStartedAt : null,
      completedAt: status === 'completed' ? normalizeSessionCompletedAt(src.completedAt) : null,
      lastAwardedAssistantKey:
        typeof src.lastAwardedAssistantKey === 'string' ? src.lastAwardedAssistantKey : null,
      dailyXpAwarded:
        typeof src.dailyXpAwarded === 'number' ? Math.max(0, Math.floor(src.dailyXpAwarded)) : 0,
      dailyXpDate: typeof src.dailyXpDate === 'string' ? src.dailyXpDate : null,
    },
    today
  )
  if (session.status === 'in_progress' && session.sessionStartedAt) {
    const started = parseDateOrNull(session.sessionStartedAt)
    if (started && nowTs - started.getTime() > TRANSLATION_SESSION_TTL_MS) {
      session = abandonTranslationSessionSlice(session)
    }
  }
  return session
}

export function startTranslationSessionState(
  state: RewardsState,
  today: string = getTodayDateString()
): RewardsState {
  const rolled = rollTranslationDailyXp(state.translationSession, today)
  return {
    ...state,
    translationSession: {
      ...rolled,
      target: TRANSLATION_SESSION_LENGTH,
      progress: 0,
      sessionXpAwarded: 0,
      status: 'in_progress',
      sessionStartedAt: new Date().toISOString(),
      completedAt: null,
      lastAwardedAssistantKey: null,
    },
  }
}

export function abandonTranslationSessionState(state: RewardsState): RewardsState {
  const session = rollTranslationDailyXp(state.translationSession)
  if (
    (session.status === 'not_started' || session.status === 'abandoned') &&
    session.progress === 0 &&
    session.sessionXpAwarded === 0 &&
    session.lastAwardedAssistantKey == null
  ) {
    return state.translationSession === session ? state : { ...state, translationSession: session }
  }
  return {
    ...state,
    translationSession: abandonTranslationSessionSlice(session),
  }
}

function rollDialogueDailyXp(
  session: DialogueSessionState,
  today: string = getTodayDateString()
): DialogueSessionState {
  if (session.dailyXpDate === today) return session
  return {
    ...session,
    dailyXpAwarded: 0,
    dailyXpDate: null,
  }
}

function abandonDialogueSessionSlice(session: DialogueSessionState): DialogueSessionState {
  return {
    ...session,
    progress: 0,
    sessionXpAwarded: 0,
    status: 'abandoned',
    sessionStartedAt: null,
    completedAt: null,
    lastAwardedAssistantKey: null,
  }
}

export function normalizeDialogueSession(
  raw: unknown,
  options?: { now?: Date; today?: string }
): DialogueSessionState {
  const fallback = createDefaultDialogueSession()
  const today = options?.today ?? getTodayDateString()
  const nowTs = (options?.now ?? new Date()).getTime()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<DialogueSessionState>
  const target =
    typeof src.target === 'number' ? Math.max(1, Math.floor(src.target)) : DIALOGUE_SESSION_LENGTH
  const progress =
    typeof src.progress === 'number' ? Math.max(0, Math.min(target, Math.floor(src.progress))) : 0
  const sessionXpAwarded =
    typeof src.sessionXpAwarded === 'number' ? Math.max(0, Math.floor(src.sessionXpAwarded)) : 0
  let status: DialogueSessionState['status'] =
    src.status === 'in_progress' ||
    src.status === 'completed' ||
    src.status === 'not_started' ||
    src.status === 'abandoned'
      ? src.status
      : progress >= target
        ? 'completed'
        : progress > 0
          ? 'in_progress'
          : 'not_started'
  if (progress >= target) status = 'completed'
  let session: DialogueSessionState = rollDialogueDailyXp(
    {
      target,
      progress: status === 'completed' ? target : progress,
      sessionXpAwarded: status === 'abandoned' ? 0 : sessionXpAwarded,
      status,
      sessionStartedAt: typeof src.sessionStartedAt === 'string' ? src.sessionStartedAt : null,
      completedAt: status === 'completed' ? normalizeSessionCompletedAt(src.completedAt) : null,
      lastAwardedAssistantKey:
        typeof src.lastAwardedAssistantKey === 'string' ? src.lastAwardedAssistantKey : null,
      dailyXpAwarded:
        typeof src.dailyXpAwarded === 'number' ? Math.max(0, Math.floor(src.dailyXpAwarded)) : 0,
      dailyXpDate: typeof src.dailyXpDate === 'string' ? src.dailyXpDate : null,
    },
    today
  )
  if (session.status === 'in_progress' && session.sessionStartedAt) {
    const started = parseDateOrNull(session.sessionStartedAt)
    if (started && nowTs - started.getTime() > DIALOGUE_SESSION_TTL_MS) {
      session = abandonDialogueSessionSlice(session)
    }
  }
  return session
}

export function startDialogueSessionState(
  state: RewardsState,
  today: string = getTodayDateString()
): RewardsState {
  const rolled = rollDialogueDailyXp(state.dialogueSession, today)
  return {
    ...state,
    dialogueSession: {
      ...rolled,
      target: DIALOGUE_SESSION_LENGTH,
      progress: 0,
      sessionXpAwarded: 0,
      status: 'in_progress',
      sessionStartedAt: new Date().toISOString(),
      completedAt: null,
      lastAwardedAssistantKey: null,
    },
  }
}

export function abandonDialogueSessionState(state: RewardsState): RewardsState {
  const session = rollDialogueDailyXp(state.dialogueSession)
  if (
    (session.status === 'not_started' || session.status === 'abandoned') &&
    session.progress === 0 &&
    session.sessionXpAwarded === 0 &&
    session.lastAwardedAssistantKey == null
  ) {
    return state.dialogueSession === session ? state : { ...state, dialogueSession: session }
  }
  return {
    ...state,
    dialogueSession: abandonDialogueSessionSlice(session),
  }
}

function rollCommunicationDailyXp(
  session: CommunicationSessionState,
  today: string = getTodayDateString()
): CommunicationSessionState {
  if (session.dailyXpDate === today) return session
  return {
    ...session,
    dailyXpAwarded: 0,
    dailyXpDate: null,
  }
}

function abandonCommunicationSessionSlice(
  session: CommunicationSessionState
): CommunicationSessionState {
  return {
    ...session,
    progress: 0,
    sessionXpAwarded: 0,
    status: 'abandoned',
    sessionStartedAt: null,
    completedAt: null,
    lastAwardedAssistantKey: null,
    englishAttemptCount: 0,
    lastStepAwardedXp: 0,
  }
}

export function normalizeCommunicationSession(
  raw: unknown,
  options?: { now?: Date; today?: string }
): CommunicationSessionState {
  const fallback = createDefaultCommunicationSession()
  const today = options?.today ?? getTodayDateString()
  const nowTs = (options?.now ?? new Date()).getTime()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<CommunicationSessionState>
  const target =
    typeof src.target === 'number'
      ? Math.max(1, Math.floor(src.target))
      : COMMUNICATION_SESSION_LENGTH
  const progress =
    typeof src.progress === 'number' ? Math.max(0, Math.min(target, Math.floor(src.progress))) : 0
  const sessionXpAwarded =
    typeof src.sessionXpAwarded === 'number' ? Math.max(0, Math.floor(src.sessionXpAwarded)) : 0
  let status: CommunicationSessionState['status'] =
    src.status === 'in_progress' ||
    src.status === 'completed' ||
    src.status === 'not_started' ||
    src.status === 'abandoned'
      ? src.status
      : progress >= target
        ? 'completed'
        : progress > 0
          ? 'in_progress'
          : 'not_started'
  if (progress >= target) status = 'completed'
  let session: CommunicationSessionState = rollCommunicationDailyXp(
    {
      target,
      progress: status === 'completed' ? target : progress,
      sessionXpAwarded: status === 'abandoned' ? 0 : sessionXpAwarded,
      status,
      sessionStartedAt: typeof src.sessionStartedAt === 'string' ? src.sessionStartedAt : null,
      completedAt: status === 'completed' ? normalizeSessionCompletedAt(src.completedAt) : null,
      lastAwardedAssistantKey:
        typeof src.lastAwardedAssistantKey === 'string' ? src.lastAwardedAssistantKey : null,
      dailyXpAwarded:
        typeof src.dailyXpAwarded === 'number' ? Math.max(0, Math.floor(src.dailyXpAwarded)) : 0,
      dailyXpDate: typeof src.dailyXpDate === 'string' ? src.dailyXpDate : null,
      englishAttemptCount:
        typeof src.englishAttemptCount === 'number'
          ? Math.max(0, Math.floor(src.englishAttemptCount))
          : 0,
      lastStepAwardedXp:
        typeof src.lastStepAwardedXp === 'number' ? Math.max(0, Math.floor(src.lastStepAwardedXp)) : 0,
    },
    today
  )
  if (session.status === 'in_progress' && session.sessionStartedAt) {
    const started = parseDateOrNull(session.sessionStartedAt)
    if (started && nowTs - started.getTime() > COMMUNICATION_SESSION_TTL_MS) {
      session = abandonCommunicationSessionSlice(session)
    }
  }
  return session
}

export function startCommunicationSessionState(
  state: RewardsState,
  today: string = getTodayDateString()
): RewardsState {
  const rolled = rollCommunicationDailyXp(state.communicationSession, today)
  return {
    ...state,
    communicationSession: {
      ...rolled,
      target: COMMUNICATION_SESSION_LENGTH,
      progress: 0,
      sessionXpAwarded: 0,
      status: 'in_progress',
      sessionStartedAt: new Date().toISOString(),
      completedAt: null,
      lastAwardedAssistantKey: null,
      englishAttemptCount: 0,
      lastStepAwardedXp: 0,
    },
  }
}

export function abandonCommunicationSessionState(state: RewardsState): RewardsState {
  const session = rollCommunicationDailyXp(state.communicationSession)
  if (
    (session.status === 'not_started' || session.status === 'abandoned') &&
    session.progress === 0 &&
    session.sessionXpAwarded === 0 &&
    session.lastAwardedAssistantKey == null
  ) {
    return state.communicationSession === session
      ? state
      : { ...state, communicationSession: session }
  }
  return {
    ...state,
    communicationSession: abandonCommunicationSessionSlice(session),
  }
}

export function normalizeTutorSession(
  raw: unknown,
  options?: { now?: Date; today?: string }
): TutorSessionState {
  const fallback = createDefaultTutorSession()
  const today = options?.today ?? getTodayDateString()
  const nowTs = (options?.now ?? new Date()).getTime()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<TutorSessionState>
  const status: TutorSessionState['status'] =
    src.status === 'in_progress' || src.status === 'not_started' || src.status === 'abandoned'
      ? src.status
      : 'not_started'
  const sessionXpAwarded =
    typeof src.sessionXpAwarded === 'number' ? Math.max(0, Math.floor(src.sessionXpAwarded)) : 0
  let session: TutorSessionState = rollTutorDailyXp(
    {
      sessionXpAwarded: status === 'abandoned' ? 0 : sessionXpAwarded,
      status,
      sessionStartedAt: typeof src.sessionStartedAt === 'string' ? src.sessionStartedAt : null,
      dailyXpAwarded:
        typeof src.dailyXpAwarded === 'number' ? Math.max(0, Math.floor(src.dailyXpAwarded)) : 0,
      dailyXpDate: typeof src.dailyXpDate === 'string' ? src.dailyXpDate : null,
      awardedExplainKeys: normalizeTutorKeyList(src.awardedExplainKeys),
      awardedMicroKeys: normalizeTutorKeyList(src.awardedMicroKeys),
    },
    today
  )
  if (session.status === 'in_progress' && session.sessionStartedAt) {
    const started = parseDateOrNull(session.sessionStartedAt)
    if (started && nowTs - started.getTime() > TUTOR_SESSION_TTL_MS) {
      session = abandonTutorSessionSlice(session)
    }
  }
  return session
}

export function startTutorSessionState(
  state: RewardsState,
  today: string = getTodayDateString()
): RewardsState {
  const rolled = rollTutorDailyXp(state.tutorSession, today)
  return {
    ...state,
    tutorSession: {
      ...rolled,
      sessionXpAwarded: 0,
      status: 'in_progress',
      sessionStartedAt: new Date().toISOString(),
    },
  }
}

export function abandonTutorSessionState(state: RewardsState): RewardsState {
  const session = rollTutorDailyXp(state.tutorSession, getTodayDateString())
  if (
    (session.status === 'not_started' || session.status === 'abandoned') &&
    session.sessionXpAwarded === 0
  ) {
    return state.tutorSession === session ? state : { ...state, tutorSession: session }
  }
  return {
    ...state,
    tutorSession: abandonTutorSessionSlice(session),
  }
}

function normalizeRewardsState(raw: unknown): RewardsState {
  const fallback = createDefaultRewardsState()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Partial<RewardsState>
  const totalXP = normalizeTotalXp(typeof src.progress?.totalXP === 'number' ? src.progress.totalXP : 0)
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
      activeDays: normalizeActiveDays(
        (src.progress as { activeDays?: unknown } | undefined)?.activeDays,
        typeof src.progress?.lastActiveDate === 'string' ? src.progress.lastActiveDate : null
      ),
    },
    currencies: {
      coins: typeof src.currencies?.coins === 'number' ? Math.max(0, Math.floor(src.currencies.coins)) : 0,
      gems: typeof src.currencies?.gems === 'number' ? Math.max(0, Math.floor(src.currencies.gems)) : 0,
      tickets: typeof src.currencies?.tickets === 'number' ? Math.max(0, Math.floor(src.currencies.tickets)) : 0,
    },
    coinLedger: normalizeCoinLedger(src.coinLedger),
    modeGoals: {
      communication: normalizeModeGoal(src.modeGoals?.communication, fallback.modeGoals.communication),
      engvo: normalizeModeGoal(src.modeGoals?.engvo, fallback.modeGoals.engvo),
    },
    translationSession: normalizeTranslationSession(
      (src as { translationSession?: unknown }).translationSession
    ),
    dialogueSession: normalizeDialogueSession((src as { dialogueSession?: unknown }).dialogueSession),
    communicationSession: normalizeCommunicationSession(
      (src as { communicationSession?: unknown }).communicationSession
    ),
    tutorSession: normalizeTutorSession((src as { tutorSession?: unknown }).tutorSession),
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
    const normalized = normalizeRewardsState(JSON.parse(raw))
    return applyRewardsCoinMigrations(normalized)
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
  const activeDays = state.progress.activeDays ?? []
  if (last === today) {
    if (activeDays.includes(today)) return state
    return {
      ...state,
      progress: {
        ...state.progress,
        activeDays: appendActiveDay(activeDays, today),
      },
    }
  }
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
      activeDays: appendActiveDay(activeDays, today),
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
  const totalXP = normalizeTotalXp(nextState.progress.totalXP + totalAward)
  const levelView = calculateLevel(totalXP)
  const defaultTicker =
    streakBonus > 0
      ? `+${totalAward} (в т.ч. +${streakBonus} за серию).`
      : `+${safeAmount}. Отличный шаг вперёд.`
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

export type SpendCoinsResult = {
  ok: boolean
  state: RewardsState
}

export type AwardCoinsResult = {
  ok: boolean
  state: RewardsState
}

export type AwardCoinsOptions = {
  lessonIdForLedger?: string
  practiceMilestoneForLedger?: string
}

export function canSpendCoins(state: RewardsState, amount: number): boolean {
  const normalized = Math.max(0, Math.floor(amount))
  if (normalized <= 0) return false
  const current = Math.max(0, Math.floor(Number(state.currencies.coins) || 0))
  return current >= normalized
}

export function spendCoins(state: RewardsState, amount: number): SpendCoinsResult {
  const normalized = Math.max(0, Math.floor(amount))
  if (normalized <= 0) return { ok: false, state }
  const current = Math.max(0, Math.floor(Number(state.currencies.coins) || 0))
  if (current < normalized) return { ok: false, state }
  return {
    ok: true,
    state: {
      ...state,
      currencies: {
        ...state.currencies,
        coins: current - normalized,
      },
    },
  }
}

export function awardCoins(
  state: RewardsState,
  amount: number,
  options?: AwardCoinsOptions
): AwardCoinsResult {
  const normalized = Math.max(0, Math.floor(amount))
  if (normalized <= 0) return { ok: false, state }
  const current = Math.max(0, Math.floor(Number(state.currencies.coins) || 0))
  const ledger = state.coinLedger ?? createDefaultCoinLedger()
  let nextLedger = ledger
  const practiceMilestone = options?.practiceMilestoneForLedger?.trim()
  if (practiceMilestone && ledger.practiceMilestones?.[practiceMilestone]) {
    return { ok: false, state }
  }
  const lessonId = options?.lessonIdForLedger?.trim()
  if (lessonId) {
    nextLedger = {
      ...ledger,
      lessonGoldClaimed: {
        ...ledger.lessonGoldClaimed,
        [lessonId]: true,
      },
    }
  }
  if (practiceMilestone) {
    nextLedger = {
      ...nextLedger,
      practiceMilestones: {
        ...nextLedger.practiceMilestones,
        [practiceMilestone]: true,
      },
    }
  }
  return {
    ok: true,
    state: {
      ...state,
      currencies: {
        ...state.currencies,
        coins: current + normalized,
      },
      coinLedger: nextLedger,
    },
  }
}
