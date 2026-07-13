import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import type { QuickTestScoreBand } from '@/lib/quickTest/types'

export type QuickTestFooterPhase =
  | 'lobby-levels'
  | 'lobby-topics'
  | 'question'
  | 'checking'
  | 'feedback-correct'
  | 'feedback-wrong'
  | 'finale'

export type QuickTestFooterView = {
  dynamic: string
  /** Always empty — bottom half is progress bar only. */
  static: string
  progress: { current: number; total: number } | null
}

export function resolveQuickTestFooter(input: {
  phase: QuickTestFooterPhase
  step?: number
  total?: number
  topicTitle?: string
  scoreBand?: QuickTestScoreBand
  correct?: number
  durationLabel?: string
  frozenHint?: boolean
}): QuickTestFooterView {
  const total = input.total ?? 5
  const step = input.step ?? 1

  switch (input.phase) {
    case 'lobby-levels':
      return {
        dynamic: input.frozenHint ? 'B1 скоро' : QUICK_TEST_COPY.pickLevelDynamic,
        static: '',
        progress: null,
      }
    case 'lobby-topics':
      return {
        dynamic: QUICK_TEST_COPY.pickTopicDynamic,
        static: '',
        progress: null,
      }
    case 'question':
      return {
        dynamic: QUICK_TEST_COPY.pickAnswerDynamic,
        static: '',
        progress: { current: step, total },
      }
    case 'checking':
      return {
        dynamic: QUICK_TEST_COPY.footerChecking,
        static: '',
        progress: { current: step, total },
      }
    case 'feedback-correct':
      return {
        dynamic: QUICK_TEST_COPY.footerCorrect,
        static: '',
        progress: { current: step, total },
      }
    case 'feedback-wrong':
      return {
        dynamic: QUICK_TEST_COPY.footerWhy,
        static: '',
        progress: { current: step, total },
      }
    case 'finale': {
      const band = input.scoreBand ?? 'start'
      const dynamic =
        band === 'perfect'
          ? QUICK_TEST_COPY.footerFinalePerfect
          : band === 'strong'
            ? QUICK_TEST_COPY.footerFinaleStrong
            : QUICK_TEST_COPY.footerFinaleStart
      return {
        dynamic,
        static: '',
        progress: { current: total, total },
      }
    }
    default:
      return { dynamic: '', static: '', progress: null }
  }
}
