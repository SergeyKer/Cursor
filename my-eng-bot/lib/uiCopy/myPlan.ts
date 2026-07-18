export type MyPlanAudience = 'child' | 'adult'

export type MyPlanWhyKind =
  | 'incomplete'
  | 'reinforce'
  | 'practice_after_theory'
  | 'next'
  | 'soft_return'

export type MyPlanButtonKind =
  | 'incomplete'
  | 'next'
  | 'practice_after_theory'
  | 'reinforce_local'
  | 'reinforce_ai'
  | 'soft_return'
  | 'empty_lessons'

const SECTIONS = {
  child: {
    sectionNow: 'Сейчас',
    sectionMore: 'Ещё можно',
    emptyTitle: 'Пока тихо',
    emptyBody: 'Загляни в Уроки — там начало.',
    emptyCta: 'К урокам',
    statusLink: 'Что я уже сделал →',
    busy: 'Готовим…',
  },
  adult: {
    sectionNow: 'Сейчас',
    sectionMore: 'Ещё можно',
    emptyTitle: 'Пока нет задачи',
    emptyBody: 'Откройте Уроки или начните короткую практику.',
    emptyCta: 'К разделу «Уроки»',
    statusLink: 'Подробнее в «Прогрессе» →',
    busy: 'Готовим…',
  },
} as const

const WHY: Record<MyPlanWhyKind, Record<MyPlanAudience, string>> = {
  incomplete: {
    child: 'Ты уже начал — давай добьём.',
    adult: 'Урок начат — можно продолжить с того же места.',
  },
  reinforce: {
    child: 'Тут часто ошибаешься — поправим.',
    adult: 'Много ошибок по теме за последнее время — стоит закрепить.',
  },
  practice_after_theory: {
    child: 'Урок пройден — теперь закрепим.',
    adult: 'После теории закроем практику по теме.',
  },
  next: {
    child: 'Следующий шаг по программе.',
    adult: 'Следующий урок в вашей программе.',
  },
  soft_return: {
    child: 'Давно не заходил — начнём легко.',
    adult: 'Давно не было активности — лёгкий шаг на сегодня.',
  },
}

const BUTTONS: Record<MyPlanButtonKind, Record<MyPlanAudience, string>> = {
  incomplete: { child: 'Продолжить', adult: 'Продолжить урок' },
  next: { child: 'Начать', adult: 'Открыть урок' },
  practice_after_theory: { child: 'Повторить', adult: 'Закрепить в практике' },
  reinforce_local: { child: 'Попробовать снова', adult: 'Повторить слабое место' },
  reinforce_ai: { child: 'Персонально с ИИ', adult: 'Персональная практика (ИИ)' },
  soft_return: { child: 'Коротко позаниматься', adult: 'Короткая практика' },
  empty_lessons: { child: 'К урокам', adult: 'К разделу «Уроки»' },
}

/** Debug / legacy shared strings. */
export const MY_PLAN_COPY = {
  zonesTitle: 'Зоны внимания',
  zonesLead: 'То, что сейчас важнее закрепить (не музей старых ошибок).',
  zonesEmpty: 'Пока тихо: тем для закрепления ещё не накопили.',
  zonesEmptyHint: 'Позанимайтесь — здесь появятся живые зоны.',
  openLesson: 'Открыть урок',
  startPractice: 'Запустить практику',
  gapTitle: 'Разрыв режимов',
  gapReason: 'В диалоге лучше, в звонке сбиваетесь — закрепим.',
  debugTitle: 'Debug: сигналы',
  debugShow: 'Показать лог памяти',
  debugHide: 'Скрыть лог',
  debugClear: 'Очистить memory',
  debugEmpty: 'Сигналов пока нет.',
  adultPaywallLead: 'Персонально по твоим ошибкам — на ИИ.',
  adultPaywallLocal: 'Пока локально',
  childLocalOnly: 'Пока обычная тренировка',
} as const

export function myPlanCopy(audience: MyPlanAudience = 'adult') {
  return SECTIONS[audience === 'child' ? 'child' : 'adult']
}

export function myPlanWhy(kind: MyPlanWhyKind, audience: MyPlanAudience = 'adult'): string {
  return WHY[kind][audience === 'child' ? 'child' : 'adult']
}

export function myPlanButton(kind: MyPlanButtonKind, audience: MyPlanAudience = 'adult'): string {
  return BUTTONS[kind][audience === 'child' ? 'child' : 'adult']
}

export function myPlanStreakLine(streak: number, audience: MyPlanAudience = 'adult'): string {
  if (audience === 'child') {
    return streak > 0 ? `Заходил(а) ${streak} дней подряд` : 'Сегодня ещё не заходил(а)'
  }
  return streak > 0 ? `Серия: ${streak} дней` : 'Серия: 0 дней'
}

export function myPlanLevelLine(
  level: number,
  totalXP: number | undefined,
  audience: MyPlanAudience = 'adult'
): string {
  if (audience === 'child') return `Уровень ${level}`
  return typeof totalXP === 'number' ? `Уровень ${level} · ${totalXP} XP` : `Уровень ${level}`
}

export function myPlanTimeLabel(
  kind: 'short' | 'medium' | 'unknown',
  audience: MyPlanAudience = 'adult'
): string | null {
  if (kind === 'unknown') return null
  if (audience === 'child') return kind === 'short' ? 'Коротко' : 'Средне'
  return kind === 'short' ? '~3 мин' : '~8 мин'
}

export function myPlanTitleIncomplete(title: string, audience: MyPlanAudience): string {
  return audience === 'child' ? `Продолжи «${title}»` : `Продолжить: ${title}`
}

export function myPlanTitleReinforce(title: string, audience: MyPlanAudience): string {
  return audience === 'child' ? `Повторим «${title}»` : `Закрепить: ${title}`
}

export function myPlanTitleNext(title: string, audience: MyPlanAudience): string {
  return audience === 'child' ? `Дальше: «${title}»` : `Следующий урок: ${title}`
}

export function myPlanTitlePractice(title: string, audience: MyPlanAudience): string {
  return audience === 'child' ? `Закрепим «${title}»` : `Закрепить: ${title}`
}
