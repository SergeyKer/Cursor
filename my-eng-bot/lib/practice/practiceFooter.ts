import {
  buildPracticeFooterDynamicText,
  type PracticeFooterContext,
} from '@/lib/practice/practiceFooterCopy'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'
import { computePracticeMasterySnapshot } from '@/lib/practice/practiceMastery'
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

export interface PracticeFooterView {
  dynamicText: string
  staticText: string
  typingKey: string
}

function modeLabel(mode: PracticeSession['mode']): string {
  if (mode === 'reference') return 'Эталон'
  if (mode === 'relaxed') return 'Лёгкая'
  if (mode === 'balanced') return 'Обычная'
  return 'Челлендж'
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

  const total = resolvePracticeTargetQuestionCount(session)
  const mastery = computePracticeMasterySnapshot(session)
  const current = Math.min(session.currentIndex + 1, Math.max(1, total))
  const staticText =
    state === 'briefing'
      ? `Практика ${modeLabel(session.mode)} | ${session.topic}`
      : state === 'completed'
        ? `Практика завершена | с первой попытки ${mastery.masteryScore}/${total}`
        : `Практика ${modeLabel(session.mode)} | ${current}/${total} | ${session.xp === 0 ? '0' : `+${session.xp}`} | COMBO x${session.streak}`

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

  const wrongAttemptsKey =
    state === 'correction' ? footerContext.wrongAttemptsOnCurrentQuestion : 0
  const wrongLimitKey = footerContext.isWrongLimitAdvance ? 'wrong-limit' : 'normal'

  return {
    dynamicText,
    staticText,
    typingKey: `practice-${session.id}-${state}-${session.currentIndex}-${session.streak}-${wrongAttemptsKey}-${wrongLimitKey}`,
  }
}
