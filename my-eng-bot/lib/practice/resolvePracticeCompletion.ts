import type { PracticeSession } from '@/types/practice'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import { buildContentFingerprint } from '@/lib/practice/buildContentFingerprint'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { resolvePracticeGlobalXp } from '@/lib/practice/practiceGlobalXpAward'
import { applyPracticeProgressAfterCompletion } from '@/lib/practice/practiceProgressUpdate'
import { buildPracticeCompletionTicker, isLegacyPracticeEconomy } from '@/lib/practice/practiceCompletionRewards'
import { createPracticeRewardUi, type PracticeRewardUi } from '@/lib/practice/practiceRewardUi'
import { featureFlags } from '@/lib/featureFlags'
import { applyPracticeGemsProgress, resolvePracticeGems } from '@/lib/practice/resolvePracticeGems'
import {
  addPracticeGlobalXpToday,
  getPracticeGlobalXpToday,
  getPracticeTopicProgress,
  savePracticeTopicProgress,
} from '@/lib/practice/practiceTopicProgressStorage'
import type { PracticeCompletionReward } from '@/lib/practice/practiceCompletionRewards'
import { computePracticeMasterySnapshot } from '@/lib/practice/practiceMastery'
import {
  getPracticeEconomyDayKey,
  resolvePracticeRingIncrement,
} from '@/lib/practice/practiceEconomyRules'
import {
  applyPracticeBadgeProgressAfterCompletion,
  buildPracticeBadgeFinaleLine,
  type PracticeBadgeRank,
} from '@/lib/practice/practiceBadges'
import {
  resolvePracticeMilestoneOutcome,
  type PracticeCompletionOutcome,
} from '@/lib/practice/practiceCompletionOutcome'

export function resolvePracticeCompletion(params: {
  session: PracticeSession
  lessonMedal?: LessonMedalTierOrNull | null
  audience?: 'adult' | 'child'
}): PracticeCompletionOutcome {
  const { session, lessonMedal, audience = 'adult' } = params
  const tier = resolvePracticeEconomyTier(lessonMedal)
  const mastery = computePracticeMasterySnapshot(session)
  const fingerprint = buildContentFingerprint(session)
  let progress = getPracticeTopicProgress(session.lessonId)
  const practiceGlobalXpToday = getPracticeGlobalXpToday()
  const todayKey = getPracticeEconomyDayKey()
  const forgivenessUsed = Boolean(session.forgivenessUsedThisRun)
  const effectiveMasteryScore = Math.min(
    mastery.plannedLength,
    mastery.masteryScore + (session.forgivenessEffectiveBonus ?? 0)
  )

  if (progress.lastRewardedSessionId === session.id) {
    const ticker = buildPracticeCompletionTicker({
      sessionXp: session.xp,
      globalAmount: 0,
      ringCount: progress.ringCount,
      ringIncremented: false,
      coinsAwarded: 0,
      tier,
      gemsAwarded: 0,
      cupAwarded: 0,
    })
    const reward: PracticeCompletionReward = {
      sessionXp: session.xp,
      globalAmount: 0,
      globalReason: tier === 0 ? 'tier0_session_only' : 'no_eligible_award',
      ringCount: progress.ringCount,
      ringIncremented: false,
      coinsAwarded: 0,
      gemsAwarded: 0,
      cupAwarded: 0,
      tier,
      ticker,
      progress,
    }
    const rewardUi: PracticeRewardUi = {
      ...createPracticeRewardUi({
        sessionId: session.id,
        sessionXp: session.xp,
        globalAmount: 0,
        globalReason: reward.globalReason,
        tier,
        progress,
        ringIncremented: false,
        coinsAwarded: 0,
        gemsAwarded: 0,
        cupAwarded: 0,
        audience,
      }),
      showPopup: false,
    }
    return {
      reward,
      rewardUi,
      globalXpToAward: 0,
      ringBonusXp: 0,
      activityNeeded: false,
      coinsAwarded: 0,
      coinMilestones: [],
      masteryScore: mastery.masteryScore,
      effectiveMasteryScore,
      correctedCount: mastery.correctedCount,
      plannedLength: mastery.plannedLength,
      forgivenessUsed,
      baseBadgeAwarded: false,
      badgeRank: 0,
      previousBadgeRank: 0,
      badgeRankAwarded: null,
      badgeLine: '',
      duplicate: true,
    }
  }

  if (isLegacyPracticeEconomy()) {
    const globalAmount = 30
    const ticker = 'Практика завершена. +30 XP за закрытую сессию.'
    const reward: PracticeCompletionReward = {
      sessionXp: session.xp,
      globalAmount,
      globalReason: 'legacy_flat_30',
      ringCount: progress.ringCount,
      ringIncremented: false,
      coinsAwarded: 0,
      gemsAwarded: 0,
      cupAwarded: 0,
      tier,
      ticker,
      progress,
    }
    const rewardUi = createPracticeRewardUi({
      sessionId: session.id,
      sessionXp: session.xp,
      globalAmount,
      globalReason: 'legacy_flat_30',
      tier,
      progress,
      ringIncremented: false,
      coinsAwarded: 0,
      gemsAwarded: 0,
      cupAwarded: 0,
      audience,
    })
    progress = {
      ...progress,
      lastPracticeAt: Date.now(),
      lastRewardedSessionId: session.id,
    }
    savePracticeTopicProgress(progress)
    reward.progress = progress
    return {
      reward,
      rewardUi,
      globalXpToAward: globalAmount,
      ringBonusXp: 0,
      activityNeeded: true,
      coinsAwarded: 0,
      coinMilestones: [],
      masteryScore: mastery.masteryScore,
      effectiveMasteryScore,
      correctedCount: mastery.correctedCount,
      plannedLength: mastery.plannedLength,
      forgivenessUsed,
      baseBadgeAwarded: false,
      badgeRank: 0,
      previousBadgeRank: 0,
      badgeRankAwarded: null,
      badgeLine: '',
      duplicate: false,
    }
  }

  const globalResult = resolvePracticeGlobalXp({
    tier,
    mode: session.mode,
    firstTrySessionXp: mastery.firstTrySessionXp,
    masteryPercent: mastery.masteryPercent,
    fingerprint,
    progress,
    practiceGlobalXpToday,
  })

  const ringIncremented = resolvePracticeRingIncrement({
    mode: session.mode,
    tier,
    effectiveMasteryScore,
    plannedLength: mastery.plannedLength,
    ringCount: progress.ringCount,
    lastQualifyingDayKey: progress.lastQualifyingDayKey,
    todayKey,
  })
  const previousProgress = progress

  progress = applyPracticeProgressAfterCompletion({
    progress,
    globalResult,
    mode: session.mode,
    fingerprint,
    masteryPercent: mastery.masteryPercent,
    sessionId: session.id,
    ringIncrement: ringIncremented,
    qualifyingDayKey: todayKey,
  })

  let gemsAwarded = 0
  const milestoneOutcome = resolvePracticeMilestoneOutcome({
    previousProgress,
    progress,
    tier,
    ringIncremented,
    cupEnabled: featureFlags.practiceTopicCupsV1,
  })
  progress = milestoneOutcome.progress
  const { coinsAwarded, coinMilestones, cupAwarded } = milestoneOutcome

  if (!featureFlags.practiceTopicCupsV1 && featureFlags.practiceGemsV1) {
    const gemsResult = resolvePracticeGems({ tier, progress, ringIncremented })
    progress = applyPracticeGemsProgress(progress, gemsResult)
    gemsAwarded = gemsResult.awarded
  }

  const badgeResult = applyPracticeBadgeProgressAfterCompletion({
    progress,
    mode: session.mode,
    tier,
    masteryScore: mastery.masteryScore,
    effectiveMasteryScore,
    plannedLength: mastery.plannedLength,
  })
  progress = badgeResult.progress
  const baseBadgeAwarded = badgeResult.rankAwarded === 1
  const previousBadgeRank = badgeResult.previousRank
  const newBadgeRank = badgeResult.newRank
  const badgeRankAwarded = badgeResult.rankAwarded
  const badgeLine = buildPracticeBadgeFinaleLine({
    lessonId: session.lessonId,
    previousRank: previousBadgeRank,
    newRank: newBadgeRank,
    rankAwarded: badgeRankAwarded,
    strongPassThisRun: badgeResult.strongPassThisRun,
    masteryScore: mastery.masteryScore,
    plannedLength: mastery.plannedLength,
    strongPassEasyNormalCount: progress.strongPassEasyNormalCount ?? 0,
    ringCount: progress.ringCount,
    mode: session.mode,
  }).text

  savePracticeTopicProgress(progress)
  if (globalResult.amount > 0) {
    addPracticeGlobalXpToday(globalResult.amount)
  }

  const globalXpToAward = globalResult.amount
  const ticker = buildPracticeCompletionTicker({
    sessionXp: session.xp,
    globalAmount: globalXpToAward,
    ringCount: progress.ringCount,
    ringIncremented,
    coinsAwarded,
    tier,
    gemsAwarded,
    cupAwarded,
  })

  const reward: PracticeCompletionReward = {
    sessionXp: session.xp,
    globalAmount: globalXpToAward,
    globalReason: globalResult.reason,
    ringCount: progress.ringCount,
    ringIncremented,
    coinsAwarded,
    gemsAwarded,
    cupAwarded,
    tier,
    ticker,
    progress,
  }

  const rewardUi = createPracticeRewardUi({
    sessionId: session.id,
    sessionXp: session.xp,
    globalAmount: globalXpToAward,
    globalReason: globalResult.reason,
    tier,
    progress,
    ringIncremented,
    coinsAwarded,
    gemsAwarded,
    cupAwarded,
    audience,
  })

  return {
    reward,
    rewardUi,
    globalXpToAward,
    ringBonusXp: 0,
    activityNeeded: true,
    coinsAwarded,
    coinMilestones,
    masteryScore: mastery.masteryScore,
    effectiveMasteryScore,
    correctedCount: mastery.correctedCount,
    plannedLength: mastery.plannedLength,
    forgivenessUsed,
    baseBadgeAwarded,
    badgeRank: newBadgeRank as PracticeBadgeRank,
    previousBadgeRank,
    badgeRankAwarded,
    badgeLine,
    duplicate: false,
  }
}
