import type { PracticeSession } from '@/types/practice'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeFooterState } from '@/lib/practice/practiceFooter'
import type { LessonFooterSegment } from '@/lib/lessonFooter'
import { formatComboSegmentText } from '@/lib/gamificationGlyphs'
import { featureFlags } from '@/lib/featureFlags'
import { formatPracticeProgressText, formatTopicCupBadgeText } from '@/lib/practice/practiceGlyphs'

export function mapPracticeFlowToFooterState(
  state:
    | 'idle'
    | 'briefing'
    | 'active'
    | 'submitting'
    | 'checking'
    | 'feedback'
    | 'correction'
    | 'generating_next'
    | 'completed'
    | 'error'
): PracticeFooterState {
  if (state === 'active') return 'idle'
  return state
}

export function buildPracticeFooterLive(params: {
  session: PracticeSession
  state: PracticeFooterState
  tier: PracticeEconomyTier
  progress: PracticeTopicProgress
  gemsPending: boolean
}): { lessonSegments: LessonFooterSegment[]; lessonTitle: string } {
  const { session, state, tier, progress, gemsPending } = params
  const total = session.questions.length
  const current = Math.min(session.currentIndex + 1, Math.max(1, total))

  if (state === 'briefing') {
    return {
      lessonSegments: [{ kind: 'goal', text: `🎯 0/${total}`, title: 'Перед стартом' }],
      lessonTitle: session.topic || 'Практика',
    }
  }

  const goalText =
    state === 'completed'
      ? `🎯 ${session.score}/${total}`
      : `🎯 ${current}/${total}`

  const xpText = session.xp === 0 ? '⭐ 0' : `⭐ +${session.xp}`

  const ringOrGemSegment: LessonFooterSegment =
    tier === 2 && featureFlags.practiceTopicCupsV1
      ? {
          kind: 'medal',
          text: progress.cupClaimed
            ? formatTopicCupBadgeText()
            : formatPracticeProgressText(progress.ringCount),
          title: progress.cupClaimed
            ? 'Тема сдана: золото + 5 практик'
            : 'До кубка: практики при золотой медали',
          medalVisual: {
            mode: 'textOnly',
            hintText: progress.cupClaimed
              ? formatTopicCupBadgeText()
              : formatPracticeProgressText(progress.ringCount),
          },
        }
      : tier === 2 && featureFlags.practiceGemsV1
        ? {
            kind: 'medal',
            text: progress.gemsClaimed ? '💎 ✓' : gemsPending ? '💎 ⏳' : `💎 ${progress.ringCount}/5`,
            title: progress.gemsClaimed
              ? 'Камень за тему получен'
              : 'Камень при 🥇 и закреплении темы',
            medalVisual: {
              mode: 'textOnly',
              hintText: progress.gemsClaimed ? '💎 ✓' : gemsPending ? '💎 ⏳' : `💎 ${progress.ringCount}/5`,
            },
          }
        : tier === 2
          ? {
              kind: 'medal',
              text: formatPracticeProgressText(progress.ringCount),
              title: 'Закрепление темы',
              medalVisual: {
                mode: 'textOnly',
                hintText: formatPracticeProgressText(progress.ringCount),
              },
            }
          : {
          kind: 'medal',
          text: formatPracticeProgressText(progress.ringCount),
          title: 'Закрепление темы',
          medalVisual: {
            mode: 'textOnly',
            hintText: formatPracticeProgressText(progress.ringCount),
          },
        }

  const comboText = formatComboSegmentText(Math.max(1, session.streak))

  const lessonSegments: LessonFooterSegment[] = [
    { kind: 'goal', text: goalText, title: 'Текущее задание' },
    { kind: 'xp', text: xpText, title: 'Очки за сессию (не к уровню)' },
    ringOrGemSegment,
    {
      kind: 'combo',
      text: comboText,
      title: session.streak >= 3 ? 'Отличный ритм!' : 'Серия верных ответов',
    },
  ]

  return {
    lessonSegments,
    lessonTitle: session.topic || 'Практика',
  }
}
