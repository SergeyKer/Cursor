import type { UserLessonProgress } from '@/types/userProgress'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
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

export function pickBestPracticeRewardOpportunity(
  lessons: UserLessonProgress[],
  getProgress: (lessonId: string) => PracticeTopicProgress = getPracticeTopicProgress
): PracticeRewardOpportunity | null {
  const opportunities: PracticeRewardOpportunity[] = []

  for (const lesson of lessons) {
    const tier = resolvePracticeEconomyTier(lesson.medal)
    const progress = getProgress(lesson.lessonId)

    if (tier === 2 && progress.gemsPending && !progress.gemsClaimed) {
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

    if (tier === 2 && !progress.gemsClaimed && progress.ringCount < 5) {
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
        label: `${lesson.topic}: 🥇 🔁 ${progress.ringCount}/5`,
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

export function formatPracticeProgressBadge(progress: PracticeTopicProgress, medal: UserLessonProgress['medal']): string {
  const tier = resolvePracticeEconomyTier(medal)
  if (tier === 2) {
    return progress.gemsClaimed ? '🥇 ✓' : `🥇 🔁 ${progress.ringCount}/5`
  }
  if (tier === 1) {
    return `🔁 ${progress.ringCount}/5`
  }
  return '⭐'
}
