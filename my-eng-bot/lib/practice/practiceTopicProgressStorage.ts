import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeMode } from '@/types/practice'
import { getPracticeEconomyDayKey } from '@/lib/practice/practiceEconomyRules'

const STORAGE_KEY = 'myeng:practice-topic-progress:v1'

type PracticeTopicProgressStore = Record<string, PracticeTopicProgress>
const PRACTICE_MODES: PracticeMode[] = ['reference', 'relaxed', 'balanced', 'challenge']

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeProgress(raw: unknown, lessonId: string): PracticeTopicProgress {
  const base = createEmptyPracticeTopicProgress(lessonId)
  if (!raw || typeof raw !== 'object') return base
  const record = raw as Partial<PracticeTopicProgress>
  const xpByMode: PracticeTopicProgress['xpByMode'] = {}
  for (const mode of PRACTICE_MODES) {
    const lane = record.xpByMode?.[mode]
    if (!lane || typeof lane !== 'object') continue
    xpByMode[mode] = {
      slotsFilled: Math.max(0, Math.min(5, Math.floor(Number(lane.slotsFilled) || 0))),
      rewardedFingerprints: Array.isArray(lane.rewardedFingerprints)
        ? lane.rewardedFingerprints.filter((value): value is string => typeof value === 'string')
        : [],
      slotScores: Array.isArray(lane.slotScores)
        ? lane.slotScores.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        : [],
    }
  }
  return {
    ...base,
    ...record,
    lessonId,
    economyVersion: Math.max(1, Math.floor(Number(record.economyVersion) || 1)),
    lastQualifyingDayKey:
      typeof record.lastQualifyingDayKey === 'string' ? record.lastQualifyingDayKey : null,
    ringCount: Math.max(0, Math.floor(record.ringCount ?? base.ringCount)),
    globalRewardedCompletions: Math.max(0, Math.floor(record.globalRewardedCompletions ?? 0)),
    consolidationSlotsFilled: Math.max(0, Math.min(5, Math.floor(record.consolidationSlotsFilled ?? 0))),
    rewardedFingerprints: Array.isArray(record.rewardedFingerprints)
      ? record.rewardedFingerprints.filter((v): v is string => typeof v === 'string')
      : [],
    localFingerprintsIn7d: Array.isArray(record.localFingerprintsIn7d)
      ? record.localFingerprintsIn7d.filter(
          (v): v is { fingerprint: string; at: number } =>
            Boolean(v && typeof v === 'object' && typeof (v as { fingerprint?: unknown }).fingerprint === 'string')
        )
      : [],
    slotScores: Array.isArray(record.slotScores)
      ? record.slotScores.filter((v): v is number => typeof v === 'number')
      : [],
    cupClaimed: Boolean(record.cupClaimed) || Boolean(record.gemsClaimed),
    xpByMode,
    baseBadgeClaimedAt:
      typeof record.baseBadgeClaimedAt === 'number' && Number.isFinite(record.baseBadgeClaimedAt)
        ? record.baseBadgeClaimedAt
        : undefined,
    pendingPracticeCoins: Math.max(0, Math.floor(Number(record.pendingPracticeCoins) || 0)),
    pendingCup: Boolean(record.pendingCup),
  }
}

export function readPracticeTopicProgressStore(): PracticeTopicProgressStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: PracticeTopicProgressStore = {}
    for (const [lessonId, value] of Object.entries(parsed)) {
      result[lessonId] = normalizeProgress(value, lessonId)
    }
    return result
  } catch {
    return {}
  }
}

export function getPracticeTopicProgress(lessonId: string): PracticeTopicProgress {
  const store = readPracticeTopicProgressStore()
  return store[lessonId] ?? createEmptyPracticeTopicProgress(lessonId)
}

export function savePracticeTopicProgress(progress: PracticeTopicProgress): void {
  if (!isBrowser()) return
  const store = readPracticeTopicProgressStore()
  store[progress.lessonId] = progress
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getPracticeGlobalXpToday(): number {
  if (!isBrowser()) return 0
  const key = 'myeng:practice-global-xp-today:v1'
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { day?: string; amount?: number }
    const today = getPracticeEconomyDayKey()
    if (parsed.day !== today) return 0
    return Math.max(0, Math.floor(parsed.amount ?? 0))
  } catch {
    return 0
  }
}

export function addPracticeGlobalXpToday(amount: number): void {
  if (!isBrowser() || amount <= 0) return
  const key = 'myeng:practice-global-xp-today:v1'
  const today = getPracticeEconomyDayKey()
  const current = getPracticeGlobalXpToday()
  window.localStorage.setItem(key, JSON.stringify({ day: today, amount: current + amount }))
}
