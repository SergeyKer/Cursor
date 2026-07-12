import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { Audience } from '@/lib/types'
import type { Bubble } from '@/types/lesson'
import type { PracticeMode, PracticeSession } from '@/types/practice'
import {
  buildPracticeBriefingThesisLines,
  type PracticeBriefingThesisParams,
} from '@/lib/practice/practiceBriefingThesisCopy'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'

export type PracticeInstructionCopy = {
  variant: FlowInfoCardVariant
  title: string
  statsLine: string
  thesisLines: string[]
}

function modeLabel(mode: PracticeMode): string {
  if (mode === 'reference') return 'Эталон'
  if (mode === 'relaxed') return 'Лёгкая'
  if (mode === 'balanced') return 'Обычная'
  return 'Челлендж'
}

function stepCount(session: PracticeSession): number {
  return resolvePracticeTargetQuestionCount(session)
}

function stepWord(total: number): string {
  return total === 1 ? 'шаг' : total < 5 ? 'шага' : 'шагов'
}

/** Intro в scroll-feed: один bubble с контекстом темы. Полные правила - в composer через buildPracticeInstructionCopy. */
export function buildPracticeBriefingBubbles(session: PracticeSession, audience: Audience): Bubble[] {
  const topic = session.topic.trim() || 'Практика'
  const mode = session.mode === 'challenge' ? 'Челлендж' : modeLabel(session.mode)
  const intro =
    audience === 'child'
      ? `${mode} «${topic}». Сначала — коротко, как победить.`
      : `${mode} по теме «${topic}». Сначала — коротко о правилах.`
  return [{ type: 'positive', content: intro }]
}

/** Полная инструкция для нижнего composer (FlowInfoStep): stakes + CTA. */
export function buildPracticeInstructionCopy(params: {
  session: PracticeSession
  audience: Audience
  thesis?: PracticeBriefingThesisParams
}): PracticeInstructionCopy {
  const { session, audience } = params
  const total = stepCount(session)
  const title = audience === 'child' ? 'Коротко о правилах' : 'Как устроена практика'
  const statsLine = `${modeLabel(session.mode)} · ${total} ${stepWord(total)}`
  const thesisLines = params.thesis ? buildPracticeBriefingThesisLines(params.thesis) : []

  return {
    variant: 'info',
    title,
    statsLine,
    thesisLines,
  }
}
