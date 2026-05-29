import type { PracticeSession } from '@/types/practice'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import { buildContentFingerprint } from '@/lib/practice/buildContentFingerprint'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  computeRingBonusXp,
  resolvePracticeGlobalXp,
} from '@/lib/practice/practiceGlobalXpAward'
import { applyPracticeProgressAfterCompletion } from '@/lib/practice/practiceProgressUpdate'
import { buildPracticeCompletionTicker, isLegacyPracticeEconomy } from '@/lib/practice/practiceCompletionRewards'
import { createPracticeRewardUi, type PracticeRewardUi } from '@/lib/practice/practiceRewardUi'
import { featureFlags } from '@/lib/featureFlags'
import { applyPracticeGemsProgress, resolvePracticeGems } from '@/lib/practice/resolvePracticeGems'
import { applyTopicCupProgress, resolveTopicCup } from '@/lib/practice/resolveTopicCup'
import {
  addPracticeGlobalXpToday,
  getPracticeGlobalXpToday,
  getPracticeTopicProgress,
  savePracticeTopicProgress,
} from '@/lib/practice/practiceTopicProgressStorage'
import type { PracticeCompletionReward } from '@/lib/practice/practiceCompletionRewards'

function computeScorePercent(session: PracticeSession): number {
  const total = session.questions.length
  if (total <= 0) return 0
  return Math.round((session.score / total) * 100)
}

export function resolvePracticeCompletion(params: {
  session: PracticeSession
  lessonMedal?: LessonMedalTierOrNull | null
  audience?: 'adult' | 'child'
}): {
  reward: PracticeCompletionReward
  rewardUi: PracticeRewardUi
  globalXpToAward: number
  ringBonusXp: number
} {
  const { session, lessonMedal, audience = 'adult' } = params
  const tier = resolvePracticeEconomyTier(lessonMedal)
  const scorePercent = computeScorePercent(session)
  const fingerprint = buildContentFingerprint(session)
  let progress = getPracticeTopicProgress(session.lessonId)
  const practiceGlobalXpToday = getPracticeGlobalXpToday()

  if (isLegacyPracticeEconomy()) {
    const globalAmount = 30
    const ticker = 'Практика завершена. +30 XP за закрытую сессию.'
    const reward: PracticeCompletionReward = {
      sessionXp: session.xp,
      globalAmount,
      globalReason: 'legacy_flat_30',
      ringCount: progress.ringCount,
      ringIncremented: false,
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
      gemsAwarded: 0,
      cupAwarded: 0,
      audience,
    })
    return { reward, rewardUi, globalXpToAward: globalAmount, ringBonusXp: 0 }
  }

  const globalResult = resolvePracticeGlobalXp({
    tier,
    mode: session.mode,
    sessionXp: session.xp,
    scorePercent,
    fingerprint,
    progress,
    practiceGlobalXpToday,
  })

  const ringIncremented = globalResult.ringIncrement
  let ringBonusXp = 0

  progress = applyPracticeProgressAfterCompletion({
    progress,
    globalResult,
    fingerprint,
    scorePercent,
    sessionId: session.id,
    economyTier: tier,
  })

  if (
    progress.ringCount >= 5 &&
    !progress.ringBonusClaimed &&
    globalResult.slotIndex === 4
  ) {
    const avgScore =
      progress.slotScores.length > 0
        ? progress.slotScores.reduce((sum, s) => sum + s, 0) / progress.slotScores.length
        : scorePercent
    ringBonusXp = computeRingBonusXp(avgScore)
    progress = { ...progress, ringBonusClaimed: true }
  }

  let gemsAwarded = 0
  let cupAwarded = 0
  if (featureFlags.practiceTopicCupsV1) {
    const cupResult = resolveTopicCup({ tier, progress, ringIncremented })
    progress = applyTopicCupProgress(progress, cupResult)
    cupAwarded = cupResult.awarded
  } else if (featureFlags.practiceGemsV1) {
    const gemsResult = resolvePracticeGems({ tier, progress, ringIncremented })
    progress = applyPracticeGemsProgress(progress, gemsResult)
    gemsAwarded = gemsResult.awarded
  }

  savePracticeTopicProgress(progress)
  if (globalResult.amount > 0) {
    addPracticeGlobalXpToday(globalResult.amount)
  }
  if (ringBonusXp > 0) {
    addPracticeGlobalXpToday(ringBonusXp)
  }

  const globalXpToAward = globalResult.amount + ringBonusXp
  const ticker = buildPracticeCompletionTicker({
    sessionXp: session.xp,
    globalAmount: globalXpToAward,
    ringCount: progress.ringCount,
    ringIncremented,
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
    gemsAwarded,
    cupAwarded,
    audience,
  })

  return { reward, rewardUi, globalXpToAward, ringBonusXp }
}
