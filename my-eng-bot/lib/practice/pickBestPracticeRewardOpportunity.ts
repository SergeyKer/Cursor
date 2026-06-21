import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { featureFlags } from '@/lib/featureFlags'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import {
  formatPracticeOpportunityLabel,
  formatPracticeOpportunityLabelWithGoldMedal,
  formatPracticeProgressText,
  formatTopicCupBadgeText,
} from '@/lib/practice/practiceGlyphs'

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

export type LessonMenuRewardIconsState = {
  cupEarned: boolean
  showRing: boolean
  ringCount: number
  ringMax: number
  ringTitle: string
  cupTitle: string
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

    if (tier === 2 && !isGoldTopicComplete(progress)) {
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
          ? formatPracticeOpportunityLabel(lesson.topic, progress.ringCount)
          : formatPracticeOpportunityLabelWithGoldMedal(lesson.topic, progress.ringCount),
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
        label: formatPracticeOpportunityLabel(lesson.topic, progress.ringCount),
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
      return progress.cupClaimed ? formatTopicCupBadgeText() : formatPracticeProgressText(progress.ringCount)
    }
    return progress.gemsClaimed
      ? '🥇 ✓'
      : `🥇 ${formatPracticeProgressText(progress.ringCount)}`
  }
  if (tier === 1) {
    return formatPracticeProgressText(progress.ringCount)
  }
  return '⭐'
}

export function practiceProgressBadgeTitle(
  progress: PracticeTopicProgress,
  medal: UserLessonProgress['medal']
): string {
  const tier = resolvePracticeEconomyTier(medal)
  if (tier === 2 && featureFlags.practiceTopicCupsV1) {
    if (progress.cupClaimed) return 'Тема сдана: золото + 5 практик'
    const left = Math.max(0, 5 - progress.ringCount)
    return left > 0
      ? `До сдачи темы: ${left} практик при золотой медали`
      : 'Закрепление темы - кубок при следующей eligible-практике'
  }
  if (tier === 1) return 'Кубок только при золотой медали'
  if (tier === 2) return 'Закрепление темы'
  return 'Практика по теме'
}

export function resolveLessonMenuRewardIcons(
  lessonId: string,
  medal: LessonMedalTierOrNull | null | undefined,
  progress: PracticeTopicProgress = getPracticeTopicProgress(lessonId)
): LessonMenuRewardIconsState | null {
  if (!medal) return null

  const tier = resolvePracticeEconomyTier(medal)
  const cupTitle = 'Тема сдана: золото + 5 практик'
  const ringTitle = practiceProgressBadgeTitle(progress, medal)

  if (featureFlags.practiceTopicCupsV1) {
    if (tier === 2 && progress.cupClaimed) {
      return {
        cupEarned: true,
        showRing: false,
        ringCount: progress.ringCount,
        ringMax: 5,
        ringTitle,
        cupTitle,
      }
    }
    if (tier >= 1) {
      return {
        cupEarned: false,
        showRing: true,
        ringCount: progress.ringCount,
        ringMax: 5,
        ringTitle,
        cupTitle,
      }
    }
    return null
  }

  if (tier >= 1) {
    return {
      cupEarned: false,
      showRing: true,
      ringCount: progress.ringCount,
      ringMax: 5,
      ringTitle,
      cupTitle,
    }
  }

  return null
}

export function resolveLessonMenuRewardIconsFromProgress(
  lessonId: string,
  lessonProgress: UserLessonProgress | null | undefined
): LessonMenuRewardIconsState | null {
  return resolveLessonMenuRewardIcons(lessonId, lessonProgress?.medal ?? null)
}

export function pickDefaultLessonIdForMenu(
  items: ReadonlyArray<{ id: string; enabled: boolean }>,
  lessonProgressMap: Record<string, UserLessonProgress | undefined>,
  getProgress: (lessonId: string) => PracticeTopicProgress = getPracticeTopicProgress
): string | null {
  const enabled = items.filter((item) => item.enabled)
  if (enabled.length === 0) return null

  const scoreLesson = (lessonId: string): number => {
    const medal = lessonProgressMap[lessonId]?.medal ?? null
    const progress = getProgress(lessonId)
    const tier = resolvePracticeEconomyTier(medal)
    if (featureFlags.practiceTopicCupsV1 && tier === 2 && progress.cupClaimed) return -1000
    if (tier === 2 && !progress.cupClaimed) return 200 + progress.ringCount
    if (tier === 1) return 100 + progress.ringCount
    if (!medal) return 50
    return 0
  }

  const sorted = [...enabled].sort((a, b) => scoreLesson(b.id) - scoreLesson(a.id))
  return sorted[0]?.id ?? null
}

/** @deprecated Use resolveLessonMenuRewardIcons + LessonMenuRewardIcons */
export function resolveLessonMenuPracticeBadge(
  lessonId: string,
  medal: LessonMedalTierOrNull | null | undefined
): { text: string; title: string } | null {
  if (!medal) return null
  const progress = getPracticeTopicProgress(lessonId)
  const text = formatPracticeProgressBadge(progress, medal)
  const title = practiceProgressBadgeTitle(progress, medal)
  if (!text || text === '⭐') return null
  return { text, title: title || text }
}
