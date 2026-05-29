import type { PracticeSession } from '@/types/practice'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeFooterState } from '@/lib/practice/practiceFooter'
import type { LessonFooterSegment } from '@/lib/lessonFooter'
import { formatComboSegmentText } from '@/lib/gamificationGlyphs'
import { featureFlags } from '@/lib/featureFlags'

export function mapPracticeFlowToFooterState(
  state: 'idle' | 'active' | 'checking' | 'feedback' | 'correction' | 'generating_next' | 'completed' | 'error'
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

  const goalText =
    state === 'completed'
      ? `🎯 ${session.score}/${total}`
      : `🎯 ${current}/${total}`

  const xpText = session.xp === 0 ? '⭐ 0 XP' : `⭐ +${session.xp}`

  const ringOrGemSegment: LessonFooterSegment =
    tier === 2 && featureFlags.practiceTopicCupsV1
      ? {
          kind: 'medal',
          text: progress.cupClaimed ? '🏆 ✓' : `🏆 ${progress.ringCount}/5`,
          title: progress.cupClaimed
            ? 'Тема сдана: золото + 5 практик'
            : 'Кубок при 🥇 и 5 практиках',
          medalVisual: {
            mode: 'textOnly',
            hintText: progress.cupClaimed ? '🏆 ✓' : `🏆 ${progress.ringCount}/5`,
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
              text: `🔁 ${Math.min(progress.ringCount, 5)}/5`,
              title: 'Закрепление темы',
              medalVisual: {
                mode: 'textOnly',
                hintText: `🔁 ${Math.min(progress.ringCount, 5)}/5`,
              },
            }
          : {
          kind: 'medal',
          text: `🔁 ${Math.min(progress.ringCount, 5)}/5`,
          title: 'Закрепление темы',
          medalVisual: { mode: 'textOnly', hintText: `🔁 ${Math.min(progress.ringCount, 5)}/5` },
        }

  const comboText = formatComboSegmentText(Math.max(1, session.streak))

  const lessonSegments: LessonFooterSegment[] = [
    { kind: 'goal', text: goalText, title: 'Текущее задание' },
    { kind: 'xp', text: xpText, title: 'XP за сессию (не к уровню)' },
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
