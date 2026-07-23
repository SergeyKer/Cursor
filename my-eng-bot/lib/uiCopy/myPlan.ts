export type MyPlanAudience = 'child' | 'adult'

export type MyPlanWhyKind =
  | 'incomplete'
  | 'reinforce'
  | 'practice_after_theory'
  | 'next'
  | 'soft_return'
  | 'weak_spot'
  | 'empty'

export type MyPlanInviteKind =
  | 'incomplete'
  | 'next_lesson'
  | 'practice_after_theory'
  | 'reinforce'
  | 'soft_return'
  | 'weak_spot'
  | 'empty'

export type MyPlanTopicKind = 'lesson' | 'practice' | 'topic' | 'words' | 'lessons'

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
    sectionProgram: 'Дальше по программе',
    emptyTitle: 'Уроки',
    emptyBody: 'Загляни в Уроки — там начало.',
    emptyCta: 'К урокам',
    statusLink: 'Что я уже сделал →',
    busy: 'Готовим…',
    referenceLink: 'Справочник',
  },
  adult: {
    sectionNow: 'Сейчас',
    sectionMore: 'Ещё можно',
    sectionProgram: 'Дальше по программе',
    emptyTitle: 'Уроки',
    emptyBody: 'Откройте Уроки или начните короткую практику.',
    emptyCta: 'К разделу «Уроки»',
    statusLink: 'Подробнее в «Прогрессе» →',
    busy: 'Готовим…',
    referenceLink: 'Справочник',
  },
} as const

const INVITE: Record<MyPlanInviteKind, Record<MyPlanAudience, string>> = {
  incomplete: { child: 'Продолжим урок?', adult: 'Продолжим урок?' },
  next_lesson: { child: 'Начнём урок?', adult: 'Начнём урок?' },
  practice_after_theory: { child: 'Продолжим практику?', adult: 'Продолжим практику?' },
  reinforce: { child: 'Поправим ошибки?', adult: 'Поправим ошибки?' },
  soft_return: { child: 'С возвращением?', adult: 'С возвращением?' },
  weak_spot: { child: 'Подтянем слабое?', adult: 'Подтянем слабое место?' },
  empty: { child: 'С чего начнём?', adult: 'С чего начнём?' },
}

const WHY: Record<Exclude<MyPlanWhyKind, 'reinforce'>, Record<MyPlanAudience, string>> = {
  incomplete: {
    child: 'Ты уже начинал урок — давай закончим.',
    adult: 'Вы уже начинали урок — не закончили. Продолжим.',
  },
  practice_after_theory: {
    child: 'Урок пройден — закрепим в практике.',
    adult: 'Теория есть — закроем практику по теме.',
  },
  next: {
    child: 'Следующий шаг по программе.',
    adult: 'Следующий урок в программе.',
  },
  soft_return: {
    child: 'Давно не заходил — начнём легко.',
    adult: 'Давно не было активности — лёгкий шаг.',
  },
  weak_spot: {
    child: 'Тут слабое место — подтянем.',
    adult: 'Слабое место — стоит закрепить.',
  },
  empty: {
    child: 'Загляни в Уроки — там начало.',
    adult: 'Откройте Уроки или короткую практику.',
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

/** Debug / shared strings. */
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
  softPracticeTopic: 'короткая',
} as const

export function myPlanCopy(audience: MyPlanAudience = 'adult') {
  return SECTIONS[audience === 'child' ? 'child' : 'adult']
}

export function myPlanNowInvite(
  kind: MyPlanInviteKind,
  audience: MyPlanAudience = 'adult'
): string {
  return INVITE[kind][audience === 'child' ? 'child' : 'adult']
}

/** Map ranker goalType → invite question. */
export function myPlanInviteFromGoalType(
  goalType: string | null | undefined,
  audience: MyPlanAudience = 'adult'
): string {
  switch (goalType) {
    case 'incomplete':
      return myPlanNowInvite('incomplete', audience)
    case 'next_lesson':
      return myPlanNowInvite('next_lesson', audience)
    case 'practice_after_theory':
      return myPlanNowInvite('practice_after_theory', audience)
    case 'reinforce':
      return myPlanNowInvite('reinforce', audience)
    case 'soft_return':
      return myPlanNowInvite('soft_return', audience)
    case 'weak_spot':
      return myPlanNowInvite('weak_spot', audience)
    default:
      return myPlanNowInvite('empty', audience)
  }
}

export function myPlanTopicLine(kind: MyPlanTopicKind, topic?: string): string {
  const t = topic?.trim()
  switch (kind) {
    case 'lesson':
      return t ? `Урок: ${t}` : 'Урок'
    case 'practice':
      return t ? `Практика: ${t}` : 'Практика'
    case 'topic':
      return t ? `Тема: ${t}` : 'Тема'
    case 'words':
      return t ? `Слова: ${t}` : 'Слова'
    case 'lessons':
      return 'Уроки'
    default:
      return t || 'Урок'
  }
}

export function myPlanWhy(
  kind: MyPlanWhyKind,
  audience: MyPlanAudience = 'adult',
  extras?: { errorCount?: number }
): string {
  const a = audience === 'child' ? 'child' : 'adult'
  if (kind === 'reinforce') {
    const n = extras?.errorCount
    if (typeof n === 'number' && n >= 1) {
      return a === 'child'
        ? `Ты ошибся здесь ${n} раз.`
        : `По этой теме ${n} ошибок за последнее время.`
    }
    return a === 'child'
      ? 'Тут часто ошибаешься — поправим.'
      : 'Много ошибок по теме — стоит закрепить.'
  }
  return WHY[kind][a]
}

export function myPlanButton(kind: MyPlanButtonKind, audience: MyPlanAudience = 'adult'): string {
  return BUTTONS[kind][audience === 'child' ? 'child' : 'adult']
}

/** Russian day word: 1 день / 2 дня / 5 дней / 21 день / 22 дня. */
export function ruDayWord(n: number): string {
  const abs = Math.abs(Math.floor(n))
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}

export function myPlanStreakLine(streak: number, audience: MyPlanAudience = 'adult'): string {
  const n = Math.max(0, Math.floor(streak))
  if (audience === 'child') {
    return n > 0 ? `Заходил(а) ${n} ${ruDayWord(n)} подряд` : 'Сегодня ещё не заходил(а)'
  }
  return n > 0 ? `Серия: ${n} ${ruDayWord(n)}` : 'Серия: 0 дней — начни сегодня'
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

export function myPlanMoreOnLevel(count: number, audience: MyPlanAudience = 'adult'): string {
  const n = Math.max(0, Math.floor(count))
  if (audience === 'child') return `Ещё ${n} на уровне.`
  return `Ещё ${n} на уровне.`
}

export type ProgramCardFooterVariant = 'launch' | 'action'

export type ProgramCardView = {
  headerTitle: string
  bodyTitle: string
  bodyReason: string
  footer: { variant: ProgramCardFooterVariant; label: string; ariaLabel: string } | null
}

/** View-model карточки «Дальше по программе» для всех programStatus. */
export function buildProgramCardView(params: {
  audience?: MyPlanAudience
  programStatus: string
  programTask?: {
    title: string
    reasonLine: string
    buttonLabel: string
    ariaLabel: string
    timeLabel?: string | null
  } | null
  unstartedCount?: number
}): ProgramCardView {
  const audience = params.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)
  const headerTitle = copy.sectionProgram

  if (params.programStatus === 'active' && params.programTask) {
    const time = params.programTask.timeLabel?.trim()
    const bodyReason = time
      ? `${params.programTask.reasonLine} · ${time}`
      : params.programTask.reasonLine
    return {
      headerTitle,
      bodyTitle: params.programTask.title,
      bodyReason,
      footer: {
        variant: 'launch',
        label: params.programTask.buttonLabel,
        ariaLabel: params.programTask.ariaLabel,
      },
    }
  }

  if (params.programStatus === 'blocked_by_incomplete') {
    return {
      headerTitle,
      bodyTitle: audience === 'child' ? 'Сначала текущий' : 'Сначала текущий',
      bodyReason:
        audience === 'child'
          ? 'Закрой начатый урок — потом откроется следующий.'
          : 'Закройте начатый урок — потом откроется следующий.',
      footer: null,
    }
  }

  if (params.programStatus === 'level_complete') {
    return {
      headerTitle,
      bodyTitle: audience === 'child' ? 'Уровень пройден' : 'Уровень пройден',
      bodyReason:
        audience === 'child'
          ? 'Все уроки этого уровня закрыты.'
          : 'Все уроки этого уровня закрыты.',
      footer: {
        variant: 'action',
        label: copy.emptyCta,
        ariaLabel: copy.emptyCta,
      },
    }
  }

  if (params.programStatus === 'no_catalog') {
    return {
      headerTitle,
      bodyTitle: audience === 'child' ? 'Уроков уровня нет' : 'Уроков уровня нет',
      bodyReason:
        audience === 'child'
          ? 'Выбери уровень или загляни в Уроки.'
          : 'Выберите уровень или загляните в Уроки.',
      footer: null,
    }
  }

  return {
    headerTitle,
    bodyTitle: audience === 'child' ? 'Нет нового урока' : 'Нет нового урока',
    bodyReason:
      audience === 'child'
        ? 'На уровне нечего открыть как новый.'
        : 'На уровне нечего открыть как новый.',
    footer: null,
  }
}
