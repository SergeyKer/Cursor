import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { featureFlags } from '@/lib/featureFlags'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'

export type PracticeRewardOpportunity = {
  lessonId: string
  topic: string
  medal: UserLessonProgress['medal']
  tier: 0 | 1 | 2
  ringCount: number
  gemsPending: boolean
  score: number
  label: string
  reason: 'gems_pending' | 'gold_ring' | 'tier1_ring' | 'tier0_session'
}

function opportunityScore(opp: PracticeRewardOpportunity): number {
  if (opp.reason === 'gems_pending') return 1000
  if (opp.reason === 'gold_ring') return 800 + opp.ringCount * 10
  if (opp.reason === 'tier1_ring') return 400 + opp.ringCount * 10
  return 100
}

function isGoldTopicComplete(progress: PracticeTopicProgress): boolean {
  if (featureFlags.practiceTopicCupsV1) {
    return progress.cupClaimed
  }
  return progress.gemsClaimed
}

export function pickBestPracticeRewardOpportunity(
  lessons: UserLessonProgress[],
  getProgress: (lessonId: string) => PracticeTopicProgress = getPracticeTopicProgress
): PracticeRewardOpportunity | null {
  const opportunities: PracticeRewardOpportunity[] = []
  const useCups = featureFlags.practiceTopicCupsV1

  for (const lesson of lessons) {
    const tier = resolvePracticeEconomyTier(lesson.medal)
    const progress = getProgress(lesson.lessonId)

    if (
      !useCups &&
      featureFlags.practiceGemsV1 &&
      tier === 2 &&
      progress.gemsPending &&
      !progress.gemsClaimed
    ) {
      opportunities.push({
        lessonId: lesson.lessonId,
        topic: lesson.topic,
        medal: lesson.medal,
        tier,
        ringCount: progress.ringCount,
        gemsPending: true,
        score: opportunityScore({
          lessonId: lesson.lessonId,
          topic: lesson.topic,
          medal: lesson.medal,
          tier,
          ringCount: progress.ringCount,
          gemsPending: true,
          score: 0,
          label: '',
          reason: 'gems_pending',
        }),
        label: `${lesson.topic}: забрать 💎`,
        reason: 'gems_pending',
      })
      continue
    }

    if (tier === 2 && !isGoldTopicComplete(progress) && progress.ringCount < 5) {
      opportunities.push({
        lessonId: lesson.lessonId,
        topic: lesson.topic,
        medal: lesson.medal,
        tier,
        ringCount: progress.ringCount,
        gemsPending: false,
        score: opportunityScore({
          lessonId: lesson.lessonId,
          topic: lesson.topic,
          medal: lesson.medal,
          tier,
          ringCount: progress.ringCount,
          gemsPending: false,
          score: 0,
          label: '',
          reason: 'gold_ring',
        }),
        label: useCups
          ? `${lesson.topic}: 🏆 ${progress.ringCount}/5`
          : `${lesson.topic}: 🥇 🔁 ${progress.ringCount}/5`,
        reason: 'gold_ring',
      })
      continue
    }

    if (tier === 1 && progress.ringCount < 5) {
      opportunities.push({
        lessonId: lesson.lessonId,
        topic: lesson.topic,
        medal: lesson.medal,
        tier,
        ringCount: progress.ringCount,
        gemsPending: false,
        score: opportunityScore({
          lessonId: lesson.lessonId,
          topic: lesson.topic,
          medal: lesson.medal,
          tier,
          ringCount: progress.ringCount,
          gemsPending: false,
          score: 0,
          label: '',
          reason: 'tier1_ring',
        }),
        label: `${lesson.topic}: 🔁 ${progress.ringCount}/5`,
        reason: 'tier1_ring',
      })
    }
  }

  if (opportunities.length === 0) return null
  return opportunities.sort((a, b) => b.score - a.score)[0] ?? null
}

export function formatPracticeProgressBadge(
  progress: PracticeTopicProgress,
  medal: UserLessonProgress['medal']
): string {
  const tier = resolvePracticeEconomyTier(medal)
  if (tier === 2) {
    if (featureFlags.practiceTopicCupsV1) {
      return progress.cupClaimed ? '🏆 ✓' : `🏆 ${progress.ringCount}/5`
    }
    return progress.gemsClaimed ? '🥇 ✓' : `🥇 🔁 ${progress.ringCount}/5`
  }
  if (tier === 1) {
    return `🔁 ${progress.ringCount}/5`
  }
  return '⭐'
}

export function resolveLessonMenuPracticeBadge(
  lessonId: string,
  medal: LessonMedalTierOrNull | null | undefined
): { text: string; title: string } | null {
  if (!featureFlags.practiceTopicCupsV1 || !medal) return null
  const progress = getPracticeTopicProgress(lessonId)
  const text = formatPracticeProgressBadge(progress, medal)
  const title = practiceProgressBadgeTitle(progress, medal)
  if (!text || text === '⭐') return null
  return { text, title: title || text }
}

export function practiceProgressBadgeTitle(
  progress: PracticeTopicProgress,
  medal: UserLessonProgress['medal']
): string {
  const tier = resolvePracticeEconomyTier(medal)
  if (tier === 2 && featureFlags.practiceTopicCupsV1) {
    if (progress.cupClaimed) return 'Тема сдана: золото + 5 практик'
    const left = Math.max(0, 5 - progress.ringCount)
    return `До сдачи темы: ${left} практик при золотой медали`
  }
  if (tier === 1) return 'Кубок только при золотой медали'
  return ''
}
