import { featureFlags } from '@/lib/featureFlags'
import { getLessonBadgeDefinition } from '@/lib/lessonBadges'
import { getLessonTopicById } from '@/lib/lessonCatalog'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { aggregateMedals } from '@/lib/lessonScore'
import {
  countPracticeBadgeStats,
  listPracticeBadgeShelf,
  pickNearestPracticeBadgeGoal,
  PRACTICE_BADGE_DEFINITIONS,
  resolvePracticeBadgeRankFromProgress,
  type PracticeBadgeDefinition,
} from '@/lib/practice/practiceBadges'
import {
  formatPracticeProgressBadge,
  pickBestPracticeRewardOpportunity,
  type PracticeRewardOpportunity,
} from '@/lib/practice/pickBestPracticeRewardOpportunity'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import { countTopicCupStats } from '@/lib/practice/topicCupStats'
import { formatStreakProgressCopy, type StreakProgressCopy } from '@/lib/streakProgressCopy'
import {
  createDefaultRewardsState,
  type RewardsState,
} from '@/lib/rewardsState'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'

export type ProgressLessonRow = {
  lessonId: string
  topic: string
  medal: LessonMedalTierOrNull | 'started' | '-'
  corePercent: number
  cycleLabel: string
  badgePart: string
  notStarted: boolean
}

export type ProgressPracticeRow = {
  lessonId: string
  topic: string
  badgeText: string
}

export type ProgressBadgeDefinitionRow = {
  definition: PracticeBadgeDefinition
  topic: string
  rank: 0 | 1 | 2 | 3
}

export type ProgressShelf = {
  dailyStreak: number
  bestDailyStreak: number
  level: number
  totalXP: number
  currentLevelXP: number
  xpToNextLevel: number
  streakCopy: StreakProgressCopy
  medals: { gold: number; silver: number; bronze: number }
  lessonBadgesEarned: number
  lessonBadgeTotal: number
  cupStats: { cups: number; withMedal: number } | null
  practiceBadgeStats: { opened: number; gold: number; total: number }
  nearestBadge: { emoji: string; line: string } | null
  practiceBadgeShelf: ReturnType<typeof listPracticeBadgeShelf>
  practiceBadgeDefinitionRows: ProgressBadgeDefinitionRow[]
  practiceRows: ProgressPracticeRow[]
  lessonRows: ProgressLessonRow[]
  currencies: { coins: number; gems: number; tickets: number }
  opportunity: PracticeRewardOpportunity | null
  isEmptyShelf: boolean
  cupsEnabled: boolean
}

function lessonCycleLabel(progress: UserLessonProgress): string {
  if (progress.cycle1Closed && !progress.medal) return ' · цикл 1 закрыт'
  if (progress.cycle1Started && !progress.medal) return ' · в процессе'
  return ''
}

export function buildProgressShelf(rewardsState: RewardsState | undefined): ProgressShelf {
  const state = rewardsState ?? createDefaultRewardsState()
  const cupsEnabled = featureFlags.practiceTopicCupsV1 === true
  const lessonProgressMap = loadLessonProgressMap()
  const lessonProgressRows = Object.values(lessonProgressMap)
  const medalList = lessonProgressRows.map((row) => row.medal)
  const medals = aggregateMedals(medalList, 4)
  const lessonBadgesEarned = lessonProgressRows.filter((row) => row.lessonBadgeEarned).length
  const practiceRowsSource = lessonProgressRows.filter((row) => row.medal)
  const cupStats = cupsEnabled ? countTopicCupStats() : null
  const practiceBadgeStats = countPracticeBadgeStats(getPracticeTopicProgress)
  const nearestBadge = pickNearestPracticeBadgeGoal(getPracticeTopicProgress)
  const practiceBadgeShelf = listPracticeBadgeShelf(getPracticeTopicProgress)

  const practiceBadgeDefinitionRows: ProgressBadgeDefinitionRow[] = PRACTICE_BADGE_DEFINITIONS.map(
    (definition) => {
      const progress = getPracticeTopicProgress(definition.lessonId)
      const rank = resolvePracticeBadgeRankFromProgress(progress)
      const topic = getLessonTopicById(definition.lessonId)?.title ?? definition.lessonId
      return { definition, topic, rank }
    }
  )

  const practiceRows: ProgressPracticeRow[] = practiceRowsSource.map((row) => {
    const topic = getLessonTopicById(row.lessonId)?.title ?? `Урок ${row.lessonId}`
    const practiceProgress = getPracticeTopicProgress(row.lessonId)
    return {
      lessonId: row.lessonId,
      topic,
      badgeText: formatPracticeProgressBadge(practiceProgress, row.medal),
    }
  })

  const lessonRows: ProgressLessonRow[] = (['1', '2', '3', '4'] as const).map((lessonId) => {
    const progress = lessonProgressMap[lessonId]
    const topic = getLessonTopicById(lessonId)?.title ?? `Урок ${lessonId}`
    if (!progress) {
      return {
        lessonId,
        topic,
        medal: '-',
        corePercent: 0,
        cycleLabel: '',
        badgePart: '',
        notStarted: true,
      }
    }
    const badge = getLessonBadgeDefinition(lessonId)
    let badgePart = ''
    if (badge && !progress.lessonBadgeEarned) {
      badgePart = ` · бейдж ${progress.lessonBadgeCriteriaMet?.length ?? 0}/3`
    } else if (progress.lessonBadgeEarned) {
      badgePart = ' · бейдж ✓'
    }
    const medalDisplay: ProgressLessonRow['medal'] =
      progress.medal ?? (progress.cycle1Closed ? 'started' : '-')
    return {
      lessonId,
      topic,
      medal: medalDisplay,
      corePercent: progress.corePercent ?? 0,
      cycleLabel: lessonCycleLabel(progress),
      badgePart,
      notStarted: false,
    }
  })

  const opportunity = pickBestPracticeRewardOpportunity(lessonProgressRows)
  const isEmptyShelf =
    medals.gold + medals.silver + medals.bronze === 0 &&
    state.progress.dailyStreak === 0 &&
    lessonBadgesEarned === 0

  return {
    dailyStreak: state.progress.dailyStreak,
    bestDailyStreak: state.progress.bestDailyStreak ?? state.progress.dailyStreak,
    level: state.progress.level,
    totalXP: state.progress.totalXP,
    currentLevelXP: state.progress.currentLevelXP,
    xpToNextLevel: state.progress.xpToNextLevel,
    streakCopy: formatStreakProgressCopy(state),
    medals,
    lessonBadgesEarned,
    lessonBadgeTotal: 4,
    cupStats,
    practiceBadgeStats,
    nearestBadge,
    practiceBadgeShelf,
    practiceBadgeDefinitionRows,
    practiceRows,
    lessonRows,
    currencies: {
      coins: state.currencies.coins,
      gems: state.currencies.gems,
      tickets: state.currencies.tickets,
    },
    opportunity,
    isEmptyShelf,
    cupsEnabled,
  }
}
