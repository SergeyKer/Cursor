import { dailyStarLabel } from '@/lib/gamificationGlyphs'
import { formatRitualDayOf7 } from '@/lib/uiCopy/progress'

export type MyPlanAudience = 'child' | 'adult'

export type MyPlanWhyKind =
  | 'incomplete'
  | 'reinforce'
  | 'practice_after_theory'
  | 'next'
  | 'improve_medal'
  | 'soft_return'
  | 'weak_spot'
  | 'open_chat'
  | 'open_call'
  | 'daily'
  | 'empty'

export type MyPlanInviteKind =
  | 'incomplete'
  | 'next_lesson'
  | 'practice_after_theory'
  | 'reinforce'
  | 'improve_medal'
  | 'soft_return'
  | 'weak_spot'
  | 'open_chat'
  | 'open_call'
  | 'daily'
  | 'empty'

export type MyPlanTopicKind = 'lesson' | 'practice' | 'topic' | 'words' | 'lessons'

export type MyPlanButtonKind =
  | 'incomplete'
  | 'next'
  | 'practice_after_theory'
  | 'reinforce_local'
  | 'reinforce_ai'
  | 'improve_medal'
  | 'soft_return'
  | 'open_chat'
  | 'open_call'
  | 'empty_lessons'
  | 'play'

const SECTIONS = {
  child: {
    sectionNow: 'Сейчас',
    sectionMore: 'Ещё можно',
    sectionProgram: 'Дальше по программе',
    sectionGrowth: 'Точки роста',
    sectionTutor: 'Репетитор',
    sectionStatus: 'Статус',
    sectionModes: 'С Engvo',
    sectionRecommendation: 'Рекомендация',
    emptyTitle: 'Уроки',
    emptyBody: 'Загляни в Уроки — там начало.',
    emptyCta: 'К урокам',
    nowIdleTitle: 'Пока спокойно',
    nowIdleReason: 'Можно начать урок по программе.',
    moreEmptyTitle: 'Пока ничего рядом',
    moreEmptyReason: 'Сначала текущее сверху.',
    statusLink: 'Что я уже сделал',
    zonesEmpty: 'Пока тихо — слабых мест нет',
    zonesEmptyCta: 'Подтянуть аспект',
    zonesRepeat: 'Повторить',
    zonesAlreadyNow: 'Это уже в «Сейчас»',
    recClosed: dailyStarLabel('Звезда сегодня есть. Календарь — в Прогрессе'),
    recOpen: dailyStarLabel('Звезды ещё нет — это слот Сейчас'),
    starClosesWithThis: `Если дойдёшь до конца — будет ${dailyStarLabel('Звезда дня')}.`,
    modesMore: 'Ещё',
    modesHide: 'Свернуть',
    modesHint: 'Чат, звонок и другие режимы — в «Ещё».',
    growthEmptyHint: 'Позанимайся — тут появятся живые темы.',
    busy: 'Готовим…',
    referenceLink: 'Справочник',
    spaceTitle: 'Мой план',
    back: '← Назад',
    progressButton: 'Прогресс',
  },
  adult: {
    sectionNow: 'Сейчас',
    sectionMore: 'Ещё можно',
    sectionProgram: 'Дальше по программе',
    sectionGrowth: 'Точки роста',
    sectionTutor: 'Репетитор',
    sectionStatus: 'Статус',
    sectionModes: 'С Engvo',
    sectionRecommendation: 'Рекомендация',
    emptyTitle: 'Уроки',
    emptyBody: 'Откройте Уроки или начните короткую практику.',
    emptyCta: 'К разделу «Уроки»',
    nowIdleTitle: 'Срочного шага нет',
    nowIdleReason: 'Откройте урок по программе или раздел «Уроки».',
    moreEmptyTitle: 'Дополнительного шага нет',
    moreEmptyReason: 'Сначала текущий или программный шаг.',
    statusLink: 'Подробнее в «Прогрессе»',
    zonesEmpty: 'Пока тихо — слабых мест нет',
    zonesEmptyCta: 'Подтянуть аспект',
    zonesRepeat: 'Повторить',
    zonesAlreadyNow: 'Это уже в «Сейчас»',
    recClosed: dailyStarLabel('Звезда сегодня есть. Календарь — в Прогрессе'),
    recOpen: dailyStarLabel('Звезды ещё нет — это слот Сейчас'),
    starClosesWithThis: `Если дойдёте до конца — будет ${dailyStarLabel('Звезда дня')}.`,
    modesMore: 'Ещё',
    modesHide: 'Свернуть',
    modesHint: 'Чат, звонок и остальные режимы — в «Ещё».',
    growthEmptyHint: 'Позанимайтесь — здесь появятся живые темы.',
    busy: 'Готовим…',
    referenceLink: 'Справочник',
    spaceTitle: 'Мой план',
    back: '← Назад',
    progressButton: 'Прогресс',
  },
} as const

const INVITE: Record<MyPlanInviteKind, Record<MyPlanAudience, string>> = {
  incomplete: { child: 'Продолжим урок?', adult: 'Продолжим урок?' },
  next_lesson: { child: 'Начнём урок?', adult: 'Начнём урок?' },
  practice_after_theory: { child: 'Продолжим практику?', adult: 'Продолжим практику?' },
  reinforce: { child: 'Поправим ошибки?', adult: 'Поправим ошибки?' },
  improve_medal: { child: 'Улучшим до золота?', adult: 'Улучшим до золота?' },
  soft_return: { child: 'С возвращением?', adult: 'С возвращением?' },
  weak_spot: { child: 'Подтянем слабое?', adult: 'Подтянем слабое место?' },
  open_chat: { child: 'Поговорим в чате?', adult: 'Поговорим в чате?' },
  open_call: { child: 'Начнём звонок?', adult: 'Начнём звонок?' },
    daily: { child: dailyStarLabel('Звезда дня'), adult: dailyStarLabel('Звезда дня') },
  empty: { child: 'С чего начнём?', adult: 'С чего начнём?' },
}

const WHY: Record<
  Exclude<
    MyPlanWhyKind,
    'reinforce' | 'incomplete' | 'improve_medal' | 'practice_after_theory' | 'daily'
  >,
  Record<MyPlanAudience, string>
> = {
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
  open_chat: {
    child: 'Поговорить в чате — живой шаг.',
    adult: 'Мало живого общения — начните с чата.',
  },
  open_call: {
    child: 'Чат был — можно трубку.',
    adult: 'Чат уже был — следующий шаг звонок.',
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
  improve_medal: { child: 'Повторить урок', adult: 'Повторить урок' },
  soft_return: { child: 'Коротко позаниматься', adult: 'Короткая практика' },
  open_chat: { child: 'В чат', adult: 'Поговорить в чате' },
  open_call: { child: 'Позвонить', adult: 'Начать звонок' },
  empty_lessons: { child: 'К урокам', adult: 'К разделу «Уроки»' },
  play: { child: 'Играть', adult: 'Начать' },
}

/** Debug / shared strings. */
export const MY_PLAN_COPY = {
  zonesTitle: 'Точки роста',
  zonesLead: 'То, что сейчас важнее закрепить.',
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

export type MyPlanQuickActionId =
  | 'communication'
  | 'engvo'
  | 'practice'
  | 'translation'
  | 'dialogue'
  | 'vocabulary'
  | 'tutor'
  | 'pronunciation'
  | 'reference'

const QUICK_ACTIONS: Record<MyPlanQuickActionId, Record<MyPlanAudience, string>> = {
  communication: { child: 'Поговори', adult: 'Поговорить' },
  engvo: { child: 'Позвони', adult: 'Позвонить' },
  practice: { child: 'Потренируйся', adult: 'Потренироваться' },
  translation: { child: 'Переведи', adult: 'Перевести' },
  dialogue: { child: 'Сыграй диалог', adult: 'Пройти диалог' },
  vocabulary: { child: 'Открой слова', adult: 'Открыть слова' },
  tutor: { child: 'Спроси', adult: 'Спросить репетитора' },
  pronunciation: { child: 'Поправь звуки', adult: 'Потренировать звуки' },
  reference: { child: 'Справка', adult: 'Открыть справку' },
}

export function myPlanCopy(audience: MyPlanAudience = 'adult') {
  return SECTIONS[audience === 'child' ? 'child' : 'adult']
}

export function myPlanQuickActionLabel(
  id: MyPlanQuickActionId,
  audience: MyPlanAudience = 'adult'
): string {
  return QUICK_ACTIONS[id][audience === 'child' ? 'child' : 'adult']
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
    case 'improve_medal':
      return myPlanNowInvite('improve_medal', audience)
    case 'soft_return':
      return myPlanNowInvite('soft_return', audience)
    case 'weak_spot':
      return myPlanNowInvite('weak_spot', audience)
    case 'open_chat':
      return myPlanNowInvite('open_chat', audience)
    case 'open_call':
      return myPlanNowInvite('open_call', audience)
    case 'daily':
      return myPlanNowInvite('daily', audience)
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

export type MyPlanWhyExtras = {
  errorCount?: number
  topic?: string
  zoneLabel?: string
  anchorLevel?: string
  incompleteCount?: number
  dayXOf7?: number
}

export function myPlanWhy(
  kind: MyPlanWhyKind,
  audience: MyPlanAudience = 'adult',
  extras?: MyPlanWhyExtras
): string {
  const a = audience === 'child' ? 'child' : 'adult'
  const topic = extras?.topic?.trim()
  const zoneLabel = extras?.zoneLabel?.trim()
  const level = extras?.anchorLevel?.trim()
  const incompleteCount = extras?.incompleteCount ?? 1

  if (kind === 'incomplete') {
    if (topic && incompleteCount > 1) {
      return a === 'child'
        ? `Из начатых — «${topic}» ближе в программе.`
        : `Из начатых — «${topic}» ближе всего в программе.`
    }
    if (topic) {
      return a === 'child' ? `Ты остановился на «${topic}».` : `Вы остановились на «${topic}».`
    }
    return a === 'child'
      ? 'Ты уже начинал урок — давай закончим.'
      : 'Вы уже начинали урок — не закончили. Продолжим.'
  }

  if (kind === 'practice_after_theory') {
    if (topic) {
      return a === 'child'
        ? `Теория «${topic}» есть — закрепим в практике.`
        : `Только что закрыли теорию «${topic}» — практика по ней.`
    }
    return a === 'child'
      ? 'Урок пройден — закрепим в практике.'
      : 'Теория есть — закроем практику по теме.'
  }

  if (kind === 'improve_medal') {
    if (level && topic) {
      return a === 'child'
        ? `На ${level}: «${topic}» ещё без золота.`
        : `На уровне ${level}: «${topic}» ещё без золота.`
    }
    if (topic) {
      return a === 'child'
        ? `«${topic}» ещё без золота — подтянем.`
        : `«${topic}» ещё без золота — подтянем.`
    }
    return a === 'child' ? 'Есть медаль — добьём золото.' : 'Есть медаль — добьём золото.'
  }

  if (kind === 'reinforce') {
    const n = extras?.errorCount
    if (zoneLabel && typeof n === 'number' && n >= 1) {
      return a === 'child'
        ? `Чаще сбивает «${zoneLabel}» (${n}).`
        : `Чаще всего сбивает «${zoneLabel}» — ${n} ошибок.`
    }
    if (typeof n === 'number' && n >= 1) {
      return a === 'child'
        ? `Ты ошибся здесь ${n} раз.`
        : `По этой теме ${n} ошибок за последнее время.`
    }
    return a === 'child'
      ? 'Тут часто ошибаешься — поправим.'
      : 'Много ошибок по теме — стоит закрепить.'
  }

  if (kind === 'daily') {
    const dayLine = formatRitualDayOf7(extras?.dayXOf7 ?? 0)
    return a === 'child'
      ? `Дойди до конца одного занятия. ${dayLine}`
      : `Дойдите до конца одного занятия. ${dayLine}`
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

export type ProgramCardFooterVariant = 'launch' | 'expand' | 'action'

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
        variant: 'expand',
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
      footer: {
        variant: 'expand',
        label: copy.emptyCta,
        ariaLabel: copy.emptyCta,
      },
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
        variant: 'expand',
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
      footer: {
        variant: 'expand',
        label: copy.emptyCta,
        ariaLabel: copy.emptyCta,
      },
    }
  }

  return {
    headerTitle,
    bodyTitle: audience === 'child' ? 'Нет нового урока' : 'Нет нового урока',
    bodyReason:
      audience === 'child'
        ? 'На уровне нечего открыть как новый.'
        : 'На уровне нечего открыть как новый.',
    footer: {
      variant: 'expand',
      label: copy.emptyCta,
      ariaLabel: copy.emptyCta,
    },
  }
}

/** View-model карточки «Сейчас» (тот же каркас, что program). */
export function buildNowCardView(params: {
  audience?: MyPlanAudience
  task?: {
    title: string
    reasonLine: string
    buttonLabel: string
    ariaLabel: string
    timeLabel?: string | null
    goalType?: string | null
  } | null
  /** Hero слота 1: ребёнок «Играть» на старте, не на «Продолжить». */
  heroStart?: boolean
}): ProgramCardView {
  const audience = params.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)
  const headerTitle = copy.sectionNow

  if (params.task) {
    const time = params.task.timeLabel?.trim()
    const bodyReason = time ? `${params.task.reasonLine} · ${time}` : params.task.reasonLine
    const isContinue = params.task.goalType === 'incomplete'
    const label =
      params.heroStart && audience === 'child' && !isContinue
        ? myPlanButton('play', 'child')
        : params.task.buttonLabel
    return {
      headerTitle,
      bodyTitle: params.task.title,
      bodyReason,
      footer: {
        variant: 'launch',
        label,
        ariaLabel: params.task.ariaLabel,
      },
    }
  }

  return {
    headerTitle,
    bodyTitle: copy.emptyTitle,
    bodyReason: copy.emptyBody,
    footer: {
      variant: 'expand',
      label: copy.emptyCta,
      ariaLabel: copy.emptyCta,
    },
  }
}

/** Soft empty «Сейчас» when catalog exists but main is absent — всегда дверь. */
export function buildIdleNowCardView(params?: {
  audience?: MyPlanAudience
  programTask?: { buttonLabel: string; ariaLabel: string } | null
}): ProgramCardView {
  const audience = params?.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)
  const program = params?.programTask
  return {
    headerTitle: copy.sectionNow,
    bodyTitle: copy.nowIdleTitle,
    bodyReason: copy.nowIdleReason,
    footer: program
      ? {
          variant: 'expand',
          label: program.buttonLabel,
          ariaLabel: program.ariaLabel,
        }
      : {
          variant: 'expand',
          label: copy.emptyCta,
          ariaLabel: copy.emptyCta,
        },
  }
}

export function buildRecommendationCardView(params: {
  audience?: MyPlanAudience
  dailyClosedToday?: boolean
  dayXOf7?: number
}): ProgramCardView {
  const audience = params.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)
  const closed = params.dailyClosedToday === true
  return {
    headerTitle: copy.sectionRecommendation,
    bodyTitle: closed ? copy.recClosed : copy.recOpen,
    bodyReason: formatRitualDayOf7(params.dayXOf7 ?? 0),
    footer: null,
  }
}

/** Soft empty «Ещё можно» when secondary is empty (no CTA). */
export function buildMoreEmptyCardView(audience?: MyPlanAudience): ProgramCardView {
  const copy = myPlanCopy(audience === 'child' ? 'child' : 'adult')
  return {
    headerTitle: copy.sectionMore,
    bodyTitle: copy.moreEmptyTitle,
    bodyReason: copy.moreEmptyReason,
    footer: null,
  }
}
