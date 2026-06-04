import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { Audience } from '@/lib/types'
import type { Bubble } from '@/types/lesson'
import type { PracticeMode, PracticeSession } from '@/types/practice'

export type PracticeInstructionCopy = {
  variant: FlowInfoCardVariant
  icon: string
  title: string
  statsLine: string
  message: string
  secondaryMessage?: string
}

function modeLabel(mode: PracticeMode): string {
  if (mode === 'reference') return 'Reference'
  if (mode === 'relaxed') return 'Relaxed'
  if (mode === 'balanced') return 'Balanced'
  return 'Challenge'
}

function stepCount(session: PracticeSession): number {
  return session.targetQuestionCount ?? session.questions.length
}

export function sessionHasChoiceQuestion(session: PracticeSession): boolean {
  return session.questions.some((question) => question.type === 'choice')
}

function modeHint(mode: PracticeMode, audience: Audience): string {
  if (mode === 'reference') {
    return audience === 'child'
      ? 'Эталон: несколько шагов, один паттерн.'
      : 'Эталон: закрепляем один паттерн на серии шагов.'
  }
  if (mode === 'challenge') {
    return audience === 'child' ? 'Режим Challenge: больше шагов.' : 'Challenge: расширенная серия заданий.'
  }
  if (mode === 'balanced') {
    return audience === 'child' ? 'Balanced: средний темп.' : 'Balanced: сбалансированный объём.'
  }
  return audience === 'child' ? 'Relaxed: мягкий старт.' : 'Relaxed: посильный объём.'
}

function voiceRuleMessage(audience: Audience, hasChoice: boolean): string {
  if (hasChoice) {
    return audience === 'child'
      ? 'Если выбрал неверно — скажи правильную фразу вслух. Без голоса дальше не пройти.'
      : 'После неверного выбора нужно сказать правильную фразу вслух. Без голосового ответа дальше не пройти.'
  }
  return audience === 'child'
    ? 'Когда попросят повторить фразу — скажи вслух, это часть практики.'
    : 'Когда практика просит повторить фразу — произнесите вслух, это часть закрепления.'
}

/** Intro в scroll-feed: один bubble с контекстом темы. Полные правила — в composer через buildPracticeInstructionCopy. */
export function buildPracticeBriefingBubbles(session: PracticeSession, audience: Audience): Bubble[] {
  const topic = session.topic.trim() || 'Практика'
  const intro =
    audience === 'child'
      ? `Практика по теме «${topic}». Сначала — короткие правила.`
      : `Практика по теме «${topic}». Сначала — как устроен процесс.`
  return [{ type: 'positive', content: intro }]
}

/** Полная инструкция для нижнего composer (FlowInfoStep): правила, режим, CTA. */
export function buildPracticeInstructionCopy(params: {
  session: PracticeSession
  audience: Audience
}): PracticeInstructionCopy {
  const { session, audience } = params
  const total = stepCount(session)
  const hasChoice = sessionHasChoiceQuestion(session)
  const title = audience === 'child' ? 'Как устроена практика' : 'Как устроена практика'
  const statsLine = `Практика ${modeLabel(session.mode)} · ${total} ${total === 1 ? 'шаг' : total < 5 ? 'шага' : 'шагов'}`
  const message = voiceRuleMessage(audience, hasChoice)
  const secondaryMessage =
    audience === 'child'
      ? `${modeHint(session.mode, audience)} Ошибка — это нормально, так учимся.`
      : `${modeHint(session.mode, audience)} Ошибка — часть обучения, не штраф. Медали и кубок — за реальный прогресс.`

  return {
    variant: 'neutral',
    icon: '🎙️',
    title,
    statsLine,
    message,
    secondaryMessage,
  }
}
