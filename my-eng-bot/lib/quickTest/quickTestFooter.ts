import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import type { QuickTestScoreBand } from '@/lib/quickTest/types'

export type QuickTestFooterPhase =
  | 'lobby-levels'
  | 'lobby-topics'
  | 'question'
  | 'feedback-correct'
  | 'feedback-wrong'
  | 'finale'

export function resolveQuickTestFooter(input: {
  phase: QuickTestFooterPhase
  step?: number
  total?: number
  topicTitle?: string
  scoreBand?: QuickTestScoreBand
  correct?: number
  durationLabel?: string
  frozenHint?: boolean
}): { dynamic: string; static: string } {
  const total = input.total ?? 5
  const topic = input.topicTitle ?? ''

  switch (input.phase) {
    case 'lobby-levels':
      return {
        dynamic: input.frozenHint ? 'B1 скоро' : QUICK_TEST_COPY.pickLevelDynamic,
        static: QUICK_TEST_COPY.staticLobby,
      }
    case 'lobby-topics':
      return {
        dynamic: QUICK_TEST_COPY.pickTopicDynamic,
        static: input.topicTitle
          ? `Уровень ${input.topicTitle} | выбери тему`
          : `выбери тему`,
      }
    case 'question':
      return {
        dynamic: '…',
        static: `${input.step ?? 1}/${total} | ${topic}`,
      }
    case 'feedback-correct':
      return {
        dynamic: QUICK_TEST_COPY.footerCorrect,
        static: `${input.step ?? 1}/${total} | ${topic}`,
      }
    case 'feedback-wrong':
      return {
        dynamic: QUICK_TEST_COPY.footerWhy,
        static: `${input.step ?? 1}/${total} | ${topic}`,
      }
    case 'finale': {
      const band = input.scoreBand ?? 'start'
      const dynamic =
        band === 'perfect'
          ? QUICK_TEST_COPY.footerFinalePerfect
          : band === 'strong'
            ? QUICK_TEST_COPY.footerFinaleStrong
            : QUICK_TEST_COPY.footerFinaleStart
      const score = `${input.correct ?? 0}/${total}`
      return {
        dynamic,
        static: `${score} | ${input.durationLabel ?? '0:00'} | ${topic}`,
      }
    }
    default:
      return { dynamic: '', static: QUICK_TEST_COPY.staticLobby }
  }
}
