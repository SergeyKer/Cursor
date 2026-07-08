import {
  CHALLENGE_ROUTE_STAGES,
  getPracticeStepSpec,
  getRouteStageForIndex,
  type PracticeRouteStageId,
} from '@/lib/practice/engine/stepSpec'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'
import type { Audience } from '@/lib/types'
import type { PracticeMode, PracticeSession } from '@/types/practice'

export interface PracticeRouteStepCopy {
  stageId: PracticeRouteStageId
  stageTitle: string
  progressLabel: string
  opening: string
}

const STAGE_TITLE: Record<PracticeRouteStageId, { adult: string; child: string }> = {
  warmup: { adult: 'Разогрев', child: 'Старт' },
  understanding: { adult: 'Понимание', child: 'Поймай смысл' },
  reinforcement: { adult: 'Закрепление', child: 'Ловушки' },
  check: { adult: 'Проверка', child: 'Финал' },
}

const DICTATION_STEP_OPENING = {
  adult: 'Без подсказок: прослушайте и запишите фразу целиком.',
  child: 'Только слух: запиши фразу целиком.',
}

const ROLEPLAY_CHALLENGE_OPENING = {
  adult: 'Ответьте собеседнику — нужна та же фраза, что на предыдущих шагах.',
  child: 'Ответь собеседнику — нужна та же фраза, что на прошлых шагах.',
}

const CHALLENGE_OPENING: Record<PracticeRouteStageId, { adult: string; child: string }> = {
  warmup: {
    adult: 'Сначала спокойно узнаём паттерн.',
    child: 'Сначала лёгкий выбор.',
  },
  understanding: {
    adult: 'Теперь паттерн нужно поймать по контексту.',
    child: 'Смотри, что происходит в истории.',
  },
  reinforcement: {
    adult: 'Варианты ближе друг к другу, выбираем внимательнее.',
    child: 'Не все слова и варианты подходят.',
  },
  check: {
    adult: 'Применяем тему как в живой ситуации.',
    child: 'Финальная проверка.',
  },
}

function legacyOpening(session: PracticeSession, questionIndex: number, previousWasCorrect: boolean | null): string {
  if (questionIndex === 0) {
    return `Начинаем практику по теме "${session.topic}". Первый шаг сделаем мягким.`
  }
  if (previousWasCorrect) return 'Предыдущий ответ засчитан. Держим темп.'
  return 'Ошибку уже разобрали. Теперь закрепим похожий паттерн.'
}

function shortModeOpening(
  mode: PracticeMode,
  questionIndex: number,
  total: number,
  audience: Audience,
  dictationOpening: string | null
): string | null {
  if (mode === 'reference') return null
  if (mode === 'challenge') return null
  const step = questionIndex + 1
  if (mode === 'relaxed') {
    return audience === 'child'
      ? `Шаг ${step}/${total} · Старт.`
      : `Шаг ${step}/${total} · Старт. Сначала лёгкий выбор.`
  }
  const body = dictationOpening ?? (audience === 'child' ? '' : 'Слушаем и выбираем.')
  return audience === 'child'
    ? `Шаг ${step}/${total} · Закрепление.${body ? ` ${body}` : ''}`
    : `Шаг ${step}/${total} · Закрепление.${body ? ` ${body}` : ''}`
}

function resolveDictationOpening(session: PracticeSession, questionIndex: number, audience: Audience): string | null {
  const stepSpec = getPracticeStepSpec(session.mode, questionIndex)
  if (stepSpec?.type !== 'dictation') return null
  return audience === 'child' ? DICTATION_STEP_OPENING.child : DICTATION_STEP_OPENING.adult
}

function resolveRoleplayOpening(session: PracticeSession, questionIndex: number, audience: Audience): string | null {
  const stepSpec = getPracticeStepSpec(session.mode, questionIndex)
  if (stepSpec?.type !== 'roleplay-mini') return null
  if (session.mode === 'challenge' && questionIndex === 9) {
    return audience === 'child' ? ROLEPLAY_CHALLENGE_OPENING.child : ROLEPLAY_CHALLENGE_OPENING.adult
  }
  return null
}

export function buildPracticeRouteStepCopy(params: {
  session: PracticeSession
  questionIndex: number
  audience: Audience
  previousWasCorrect: boolean | null
}): PracticeRouteStepCopy | null {
  const { session, questionIndex, audience, previousWasCorrect } = params
  const total = resolvePracticeTargetQuestionCount(session)

  if (session.mode === 'reference') {
    return null
  }

  if (session.mode !== 'challenge') {
    const dictationOpening = resolveDictationOpening(session, questionIndex, audience)
    const opening = shortModeOpening(session.mode, questionIndex, total, audience, dictationOpening)
    if (!opening) return null
    return {
      stageId: 'warmup',
      stageTitle: audience === 'child' ? 'Старт' : 'Старт',
      progressLabel: `Шаг ${questionIndex + 1}/${total}`,
      opening,
    }
  }

  const stage = getRouteStageForIndex(session.mode, questionIndex)
  if (!stage) return null

  const titles = STAGE_TITLE[stage.stageId]
  const stageTitle = audience === 'child' ? titles.child : titles.adult
  const dictationOpening = resolveDictationOpening(session, questionIndex, audience)
  const roleplayOpening = resolveRoleplayOpening(session, questionIndex, audience)
  const body = roleplayOpening ?? dictationOpening
    ? dictationOpening
    : audience === 'child'
      ? CHALLENGE_OPENING[stage.stageId].child
      : CHALLENGE_OPENING[stage.stageId].adult
  const trap =
    questionIndex === 10 ? (audience === 'child' ? ' · финальная ловушка' : ' · финальная ловушка') : ''

  return {
    stageId: stage.stageId,
    stageTitle,
    progressLabel: `Шаг ${questionIndex + 1}/${total}`,
    opening: `Шаг ${questionIndex + 1}/${total} · ${stageTitle}${trap}. ${body}`,
  }
}

export function buildPracticeFeedOpening(params: {
  session: PracticeSession
  questionIndex: number
  audience: Audience
  previousWasCorrect: boolean | null
}): string {
  const route = buildPracticeRouteStepCopy(params)
  if (route) return route.opening
  return legacyOpening(params.session, params.questionIndex, params.previousWasCorrect)
}

export function buildChallengeBriefingRouteLine(audience: Audience): string {
  if (audience === 'child') {
    return 'У тебя 4 мини-раунда: Разогрев → Понимание → Ловушки → Финальный вызов.'
  }
  return '12 шагов: разогрев → понимание → закрепление → проверка.'
}

export { CHALLENGE_ROUTE_STAGES }
