import {
  buildPracticeFooterDynamicText,
  type PracticeFooterContext,
} from '@/lib/practice/practiceFooterCopy'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'
import { resolvePracticeFooterTopLine } from '@/lib/practice/practiceCoach'
import type { PracticeSession } from '@/types/practice'

export type PracticeFooterState =
  | 'briefing'
  | 'idle'
  | 'submitting'
  | 'checking'
  | 'feedback'
  | 'correction'
  | 'generating'
  | 'generating_next'
  | 'completed'
  | 'error'

export type PracticeSessionMeter = {
  current: number
  target: number
  sessionXp: number
  statusLabel: string
  fillPercent: number
}

export interface PracticeFooterView {
  dynamicText: string
  /** Legacy bottom line — AppShell must keep footerStaticText null when sessionMeter is shown. */
  staticText: string
  sessionMeter: PracticeSessionMeter
  typingKey: string
}

function practiceFillPercent(current: number, target: number): number {
  const safeTarget = Math.max(1, Math.floor(target))
  const safeCurrent = Math.max(0, Math.min(safeTarget, Math.floor(current)))
  return Math.round((safeCurrent / safeTarget) * 100)
}

export function practiceStatusLabel(params: {
  state: PracticeFooterState
  remaining: number
}): string {
  if (params.state === 'completed') return '🏁'
  if (params.state === 'correction' || params.state === 'feedback') {
    // feedback with wrong-limit still uses 🎯; correction = retry
    if (params.state === 'correction') return '🔁'
  }
  return `🎯${Math.max(0, Math.floor(params.remaining))}`
}

export function getPracticeFooterView(
  session: PracticeSession,
  state: PracticeFooterState,
  context?: Partial<PracticeFooterContext>
): PracticeFooterView {
  const footerContext: PracticeFooterContext = {
    audience: context?.audience ?? 'adult',
    wrongAttemptsOnCurrentQuestion:
      context?.wrongAttemptsOnCurrentQuestion ?? session.wrongAttemptsOnCurrentQuestion ?? 0,
    questionType: context?.questionType,
    isWrongLimitAdvance: context?.isWrongLimitAdvance ?? false,
    correctionPhase: context?.correctionPhase ?? 'idle',
    coinBalance: context?.coinBalance,
  }
  const dynamicOverride = buildPracticeFooterDynamicText({
    state,
    ...footerContext,
  })

  const target = resolvePracticeTargetQuestionCount(session)
  const answered = Math.max(0, session.answers.length)
  const current = Math.min(answered, target)
  const remaining = Math.max(0, target - current)
  const sessionXp = Math.max(0, Math.floor(session.xp))

  const lastAnswer = session.answers.at(-1)
  const coach = resolvePracticeFooterTopLine({
    state,
    audience: footerContext.audience,
    correctionPhase: footerContext.correctionPhase,
    isWrongLimitAdvance: footerContext.isWrongLimitAdvance,
    lastAnswerCorrected: Boolean(lastAnswer?.corrected),
    lastAnswerFirstTryCorrect: Boolean(lastAnswer?.isCorrect && !lastAnswer.corrected),
    forgivenessIntent: session.forgivenessAppliedAckActive
      ? 'applied'
      : session.forgivenessConfirmPending
        ? (footerContext.coinBalance ?? 0) > 0
          ? 'offer'
          : 'zero'
        : null,
  })
  const dynamicText =
    dynamicOverride ??
    (state === 'briefing'
      ? footerContext.audience === 'child'
        ? 'Посмотри правила — затем к заданию.'
        : 'Посмотрите правила — затем к заданию.'
      : state === 'error'
        ? 'Что-то пошло не так. Дадим безопасный вариант.'
        : session.streak >= 3 && state === 'idle'
          ? `COMBO x${session.streak}. Отличный ритм.`
          : coach.text)

  const statusLabel =
    state === 'feedback' && footerContext.isWrongLimitAdvance
      ? `🎯${remaining}`
      : practiceStatusLabel({ state, remaining })

  const wrongAttemptsKey =
    state === 'correction' ? footerContext.wrongAttemptsOnCurrentQuestion : 0
  const wrongLimitKey = footerContext.isWrongLimitAdvance ? 'wrong-limit' : 'normal'

  return {
    dynamicText,
    staticText: '',
    sessionMeter: {
      current: state === 'briefing' ? 0 : current,
      target,
      sessionXp,
      statusLabel: state === 'briefing' ? `🎯${target}` : statusLabel,
      fillPercent: practiceFillPercent(state === 'briefing' ? 0 : current, target),
    },
    typingKey: `practice-${session.id}-${state}-${session.currentIndex}-${session.streak}-${wrongAttemptsKey}-${wrongLimitKey}-${current}`,
  }
}
