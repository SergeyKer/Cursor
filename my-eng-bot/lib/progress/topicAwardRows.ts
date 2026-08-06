import { featureFlags } from '@/lib/featureFlags'
import { getLessonBadgeDefinition } from '@/lib/lessonBadges'
import { getPracticeLessonTopics } from '@/lib/lessonCatalog'
import {
  buildPracticeBadgeBriefingLine,
  getPracticeBadgeDefinition,
  practiceBadgeRankEmoji,
  practiceBadgeRankName,
  resolvePracticeBadgeRankFromProgress,
  type PracticeBadgeRank,
} from '@/lib/practice/practiceBadges'
import { formatPracticeProgressText, formatTopicCupBadgeText } from '@/lib/practice/practiceGlyphs'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'

export type ProgressTopicAwardRankStep = {
  rank: 1 | 2 | 3
  name: string
  done: boolean
}

export type ProgressTopicAwardRow = {
  lessonId: string
  topic: string
  topicEmoji: string | null
  medal: LessonMedalTierOrNull | 'started' | '-'
  notStarted: boolean
  lessonBadgeEarned: boolean
  lessonBadgePart: string
  rank: PracticeBadgeRank
  rankGlyph: string
  rankName: string | null
  rankSteps: ProgressTopicAwardRankStep[]
  nextLine: string | null
  hasPracticeBadge: boolean
  ringCount: number
  cupClaimed: boolean
  ringBadgeText: string | null
  showChallengeCta: boolean
}

/** Accordion: open id, or null when closed. Opening another id replaces. */
export function toggleTopicAwardExpanded(
  current: string | null,
  tappedLessonId: string
): string | null {
  return current === tappedLessonId ? null : tappedLessonId
}

export type ProgressTopicLaunchKind = 'lesson' | 'practice' | 'challenge'

export function resolveTopicAwardLaunch(
  row: Pick<ProgressTopicAwardRow, 'lessonId' | 'showChallengeCta'>,
  kind: ProgressTopicLaunchKind
): { kind: 'lesson' | 'practice'; lessonId: string; mode?: 'balanced' | 'challenge' } {
  if (kind === 'lesson') return { kind: 'lesson', lessonId: row.lessonId }
  if (kind === 'challenge' && row.showChallengeCta) {
    return { kind: 'practice', lessonId: row.lessonId, mode: 'challenge' }
  }
  return { kind: 'practice', lessonId: row.lessonId, mode: 'balanced' }
}

function medalDisplay(progress: UserLessonProgress | undefined): ProgressTopicAwardRow['medal'] {
  if (!progress) return '-'
  return progress.medal ?? (progress.cycle1Closed ? 'started' : '-')
}

export function buildProgressTopicAwardRows(): ProgressTopicAwardRow[] {
  const lessonProgressMap = loadLessonProgressMap()
  const cupsEnabled = featureFlags.practiceTopicCupsV1 === true
  const topics = getPracticeLessonTopics().filter((t) => t.enabled && t.hasPractice)

  return topics.map((topic) => {
    const lessonId = topic.id
    const progress = lessonProgressMap[lessonId]
    const practiceProgress = getPracticeTopicProgress(lessonId)
    const definition = getPracticeBadgeDefinition(lessonId)
    const rank = resolvePracticeBadgeRankFromProgress(practiceProgress)
    const medal = medalDisplay(progress)
    const hasMedal = Boolean(progress?.medal)
    const lessonBadge = getLessonBadgeDefinition(lessonId)
    let lessonBadgePart = ''
    if (lessonBadge && progress && !progress.lessonBadgeEarned) {
      lessonBadgePart = `бейдж урока ${progress.lessonBadgeCriteriaMet?.length ?? 0}/3`
    } else if (progress?.lessonBadgeEarned) {
      lessonBadgePart = 'бейдж урока ✓'
    }

    const rankSteps: ProgressTopicAwardRankStep[] =
      definition?.ranks.map((name, index) => {
        const step = (index + 1) as 1 | 2 | 3
        return { rank: step, name, done: rank >= step }
      }) ?? []

    const cupClaimed = Boolean(practiceProgress.cupClaimed)
    const ringCount = Math.max(0, practiceProgress.ringCount ?? 0)
    let ringBadgeText: string | null = null
    if (cupsEnabled && hasMedal) {
      ringBadgeText = cupClaimed ? formatTopicCupBadgeText() : formatPracticeProgressText(ringCount)
    }

    return {
      lessonId,
      topic: topic.title,
      topicEmoji: definition?.emoji ?? null,
      medal,
      notStarted: !progress,
      lessonBadgeEarned: Boolean(progress?.lessonBadgeEarned),
      lessonBadgePart,
      rank,
      rankGlyph: practiceBadgeRankEmoji(rank),
      rankName: definition ? practiceBadgeRankName(definition, rank) : null,
      rankSteps,
      nextLine: definition
        ? buildPracticeBadgeBriefingLine({ lessonId, progress: practiceProgress })
        : null,
      hasPracticeBadge: Boolean(definition),
      ringCount,
      cupClaimed,
      ringBadgeText,
      showChallengeCta: cupsEnabled && hasMedal && !cupClaimed,
    }
  })
}
