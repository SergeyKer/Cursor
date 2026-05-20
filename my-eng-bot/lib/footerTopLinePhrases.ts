export type FooterCopyAudience = 'adult' | 'child'
export type SessionTransitionSource = 'lesson' | 'practice' | 'accent'

type RewardTemplateMap = Record<string, { adult: string[]; child: string[] }>

const REWARD_TOP_LINE_TEMPLATES: RewardTemplateMap = {
  lesson_xp_awarded: {
    adult: ['Хороший шаг. +{xp} XP к уровню.'],
    child: ['Отлично! +{xp} XP к уровню!'],
  },
  lesson_step_completed: {
    adult: ['Хороший шаг вперёд. +{xp} XP.'],
    child: ['Отлично! +{xp} XP!'],
  },
  lesson_completed: {
    adult: ['Урок завершён. +{xp} XP за прогресс.'],
    child: ['Урок готов! +{xp} XP!'],
  },
  practice_completed: {
    adult: ['Практика завершена. +{xp} XP.'],
    child: ['Практика завершена! +{xp} XP!'],
  },
  accent_block_completed: {
    adult: ['Блок произношения закрыт. +{xp} XP.'],
    child: ['Блок произношения закрыт! +{xp} XP!'],
  },
  accent_session_completed: {
    adult: ['Сессия произношения завершена. +{xp} XP.'],
    child: ['Произношение готово! +{xp} XP!'],
  },
  communication_goal_completed: {
    adult: ['Цель общения 7/7 закрыта. +{xp} XP.'],
    child: ['Цель чата 7/7! +{xp} XP!'],
  },
  engvo_goal_completed: {
    adult: ['Цель звонка 7/7 закрыта. +{xp} XP.'],
    child: ['Цель звонка 7/7! +{xp} XP!'],
  },
}

const FALLBACK_REWARD_TOP_LINE: Record<FooterCopyAudience, string> = {
  adult: '+{xp} XP. Отличный шаг вперёд.',
  child: 'Супер! +{xp} XP!',
}

const TRANSITION_BY_SOURCE: Record<SessionTransitionSource, Record<FooterCopyAudience, string[]>> = {
  lesson: {
    adult: [
      'Урок завершён. Можно закрепить это в разговоре.',
      'Хороший момент перейти в практику.',
    ],
    child: [
      'Урок готов! Давай попробуем в разговоре.',
      'Класс! Пора к следующему шагу.',
    ],
  },
  practice: {
    adult: [
      'Практика закрыта. Можно сделать ещё один короткий шаг.',
      'Хорошо закрепили. Готовы продолжать.',
    ],
    child: [
      'Практика готова! Можно ещё один шаг!',
      'Отлично получилось. Давай дальше!',
    ],
  },
  accent: {
    adult: [
      'Произношение закрыто. Можно закрепить в диалоге.',
      'Хороший блок. Двигаемся к следующему.',
    ],
    child: [
      'Произношение готово! Крутой шаг!',
      'Супер! Можно идти дальше.',
    ],
  },
}

function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickStableTemplate(templates: string[], seed: string): string {
  if (templates.length === 0) return ''
  const index = stableHash(seed) % templates.length
  return templates[index] ?? templates[0] ?? ''
}

function fillRewardTemplate(template: string, amount: number): string {
  return template.replaceAll('{xp}', String(Math.max(0, Math.floor(amount))))
}

export function formatRewardTopLine(params: {
  reason: string
  amount: number
  audience: FooterCopyAudience
  fallback?: string | null
}): string {
  const { reason, amount, audience, fallback } = params
  const templates = REWARD_TOP_LINE_TEMPLATES[reason]?.[audience]
  const template =
    templates && templates.length > 0
      ? pickStableTemplate(templates, `${reason}:${audience}`)
      : typeof fallback === 'string' && fallback.trim()
        ? fallback.trim()
        : FALLBACK_REWARD_TOP_LINE[audience]
  return fillRewardTemplate(template, amount)
}

export function getSessionTransitionTopLine(params: {
  source: SessionTransitionSource
  audience: FooterCopyAudience
  seed?: string
}): string {
  const { source, audience, seed } = params
  const templates = TRANSITION_BY_SOURCE[source][audience]
  return pickStableTemplate(templates, seed ?? `${source}:${audience}`)
}
