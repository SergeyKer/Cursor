import { resolveQuickTestFinalePresentation } from '@/lib/quickTest/resolveQuickTestFinalePresentation'
import type { FooterVoiceTone } from '@/lib/footerVoice'
import type { QuickTestScoreBand } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
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
  answerCount?: number
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
        typingKey: `quick-test-step-${step}`,
      }
    case 'checking':
      return {
        dynamic: QUICK_TEST_COPY.footerChecking,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-step-${step}`,
      }
    case 'feedback-correct':
      return {
        dynamic: QUICK_TEST_COPY.footerCorrect,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-step-${step}`,
      }
    case 'feedback-wrong':
      return {
        dynamic: QUICK_TEST_COPY.footerWhy,
        static: buildQuickTestFooterStatic(step, total, true),
        progress: { current: step, total },
        tone,
        typingKey: `quick-test-step-${step}`,
      }
    case 'finale': {
      const correct = input.correct ?? 0
      const answerCount = input.answerCount ?? correct
      const presentation = resolveQuickTestFinalePresentation({
        correct,
        total: input.total ?? 5,
        answerCount,
      })
      const band = input.scoreBand ?? presentation.band
      return {
        dynamic: presentation.footerTitle,
        static: buildQuickTestFooterStatic(total, total, true),
        progress: { current: total, total },
        tone: resolveQuickTestFooterTone('finale', band),
        typingKey: `quick-test-finale-${presentation.mode}-${correct}`,
      }
    }
    default:
      return { dynamic: '', static: '', progress: null, tone: 'neutral', typingKey: 'quick-test-idle' }
  }
}
