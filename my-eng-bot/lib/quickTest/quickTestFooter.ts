import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import type { FooterVoiceTone } from '@/lib/footerVoice'
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
  static: string
  progress: { current: number; total: number } | null
  tone: FooterVoiceTone
  typingKey: string
}

function resolveQuickTestFooterTone(
  phase: QuickTestFooterPhase,
  scoreBand?: QuickTestScoreBand
): FooterVoiceTone {
  switch (phase) {
    case 'checking':
      return 'thinking'
    case 'feedback-correct':
      return 'celebrate'
    case 'feedback-wrong':
      return 'hint'
    case 'finale':
      if (scoreBand === 'perfect') return 'celebrate'
      if (scoreBand === 'strong') return 'support'
      return 'neutral'
    default:
      return 'hint'
  }
}

function buildQuickTestFooterStatic(step: number, total: number, showProgress: boolean): string {
  if (!showProgress) return ''
  return QUICK_TEST_COPY.questionStepLabel(step, total)
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
  const tone = resolveQuickTestFooterTone(input.phase, input.scoreBand)

  switch (input.phase) {
    case 'lobby-levels':
      return {
        dynamic: input.frozenHint ? 'B1 скоро' : QUICK_TEST_COPY.pickLevelDynamic,
        static: '',
        progress: null,
        tone: input.frozenHint ? 'neutral' : tone,
        typingKey: `quick-test-lobby-levels-${input.frozenHint ? 'frozen' : 'pick'}`,
      }
    case 'lobby-topics':
      return {
        dynamic: QUICK_TEST_COPY.pickTopicDynamic,
        static: '',
        progress: null,
        tone,
        typingKey: 'quick-test-lobby-topics',
      }
    case 'question':
      return {
        dynamic: QUICK_TEST_COPY.pickAnswerDynamic,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-question-${step}`,
      }
    case 'checking':
      return {
        dynamic: QUICK_TEST_COPY.footerChecking,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-checking-${step}`,
      }
    case 'feedback-correct':
      return {
        dynamic: QUICK_TEST_COPY.footerCorrect,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-feedback-correct-${step}`,
      }
    case 'feedback-wrong':
      return {
        dynamic: QUICK_TEST_COPY.footerWhy,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-feedback-wrong-${step}`,
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
        static: buildQuickTestFooterStatic(total, total, true),
        progress: { current: total, total },
        tone,
        typingKey: `quick-test-finale-${band}`,
      }
    }
    default:
      return { dynamic: '', static: '', progress: null, tone: 'neutral', typingKey: 'quick-test-idle' }
  }
}
