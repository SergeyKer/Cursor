import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { Audience } from '@/lib/types'
import type { Bubble } from '@/types/lesson'
import type { PracticeMode, PracticeSession } from '@/types/practice'
import { buildChallengeBriefingFormatsLine, buildChallengeBriefingRouteLine } from '@/lib/practice/practiceRouteCopy'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'

export type PracticeInstructionCopy = {
  variant: FlowInfoCardVariant
  icon: string
  iconBetweenCaption: { before: string; after: string }
  title: string
  statsLine: string
  message: string
  secondaryMessage?: string
}

function modeLabel(mode: PracticeMode): string {
  if (mode === 'reference') return 'Reference'
  if (mode === 'relaxed') return 'Relaxed'
  if (mode === 'balanced') return 'Balanced'
  return 'Челлендж'
}

function stepCount(session: PracticeSession): number {
  return resolvePracticeTargetQuestionCount(session)
}

export function sessionHasChoiceQuestion(session: PracticeSession): boolean {
  return session.questions.some((question) => question.type === 'choice')
}

/** Короткий темп режима в statsLine (режим уже назван выше). */
function modeStatsSuffix(mode: PracticeMode, audience: Audience): string {
  if (mode === 'reference') {
    return audience === 'child' ? 'один шаблон' : 'один паттерн'
  }
  if (mode === 'challenge') {
    return audience === 'child' ? 'побольше' : 'плотнее'
  }
  if (mode === 'balanced') {
    return audience === 'child' ? 'средне' : 'ровный темп'
  }
  return audience === 'child' ? 'мягко' : 'без спешки'
}

/** Подпись под правилом: две короткие строки (ошибки + речь со временем). */
function instructionMindsetLine(audience: Audience): string {
  if (audience === 'child') {
    return 'Ошибки ведут к победам.\nГоворить учится с практикой и временем.'
  }
  return 'Ошибки ведут к победам.\nНавык говорения - со временем и тренировками.'
}

function voiceRuleMessage(audience: Audience, hasChoice: boolean): string {
  if (hasChoice) {
    return audience === 'child'
      ? 'Если выбрал неверно - скажи правильную фразу вслух. Текст - через карандаш в поле.'
      : 'После неверного выбора закрепите правильную фразу вслух. Текст - через карандаш в поле.'
  }
  return audience === 'child'
    ? 'Когда попросят повторить фразу - скажи вслух, это часть практики.'
    : 'Когда практика просит повторить фразу - произнесите вслух, это часть закрепления.'
}

/** Intro в scroll-feed: один bubble с контекстом темы. Полные правила - в composer через buildPracticeInstructionCopy. */
export function buildPracticeBriefingBubbles(session: PracticeSession, audience: Audience): Bubble[] {
  const topic = session.topic.trim() || 'Практика'
  const intro =
    audience === 'child'
      ? `Практика по теме «${topic}». Сначала - короткие правила.`
      : `Практика по теме «${topic}». Сначала - как устроен процесс.`
  const bubbles: Bubble[] = [{ type: 'positive', content: intro }]
  if (session.mode === 'challenge') {
    bubbles.push({ type: 'info', content: buildChallengeBriefingRouteLine(audience) })
    bubbles.push({ type: 'info', content: buildChallengeBriefingFormatsLine() })
  }
  return bubbles
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
  const stepWord = total === 1 ? 'шаг' : total < 5 ? 'шага' : 'шагов'
  const statsLine = `Практика ${modeLabel(session.mode)} · ${total} ${stepWord} · ${modeStatsSuffix(session.mode, audience)}`
  const message = voiceRuleMessage(audience, hasChoice)
  const secondaryMessage = instructionMindsetLine(audience)

  return {
    variant: 'neutral',
    icon: '🎙️',
    iconBetweenCaption: { before: 'Engvo AI', after: 'English Voice' },
    title,
    statsLine,
    message,
    secondaryMessage,
  }
}
