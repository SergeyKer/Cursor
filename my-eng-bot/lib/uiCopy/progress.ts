export type ProgressAudience = 'child' | 'adult'

const SECTIONS = {
  child: {
    awardsTitle: 'Награды',
    showShelf: 'Показать мои награды',
    hideShelf: 'Скрыть награды',
    todayTitle: 'Сегодня',
    balanceTitle: 'Мой счёт',
    coinsLabel: 'Монеты',
    gemsLabel: 'Камни',
    ticketsLabel: 'Билеты',
    aiTitle: 'С ИИ',
    dialogueCorrect: 'Верных сегодня',
    usageLabel: 'Сообщений',
    premiumCue: 'С ИИ можно глубже',
    nearRewardTitle: 'Почти награда',
    toMyPlan: 'Что делать сейчас →',
    toMyPlanAria: 'Открыть Мой план',
    emptyTitle: 'Награды пока пустые',
    emptyBody: 'Зайди в Мой план — там первый шаг.',
    streakMore: 'Подробнее о серии',
    streakHide: 'Скрыть про серию',
    recordLabel: 'Рекорд',
    levelToNext: 'до уровня',
    practiceBadgesTitle: 'Бейджи практики',
    practiceTopicsTitle: 'Практика по темам',
    lessonAwardsTitle: 'Награды уроков',
    allBadgeStepsDone: 'Все ступени собраны.',
    needMedalFirst: 'Сначала получи медаль в уроке.',
    modeCommunication: 'Общение',
    modeEngvo: 'Звонок',
    statusCompleted: 'Готово',
    statusInProgress: 'В процессе',
    statusAbandoned: 'Прервано',
    statusNotStarted: 'Ещё не начато',
    goalDone: 'Готово',
    daysShort: 'дней',
    levelShort: 'уровень',
    goalShort: 'Цель',
  },
  adult: {
    awardsTitle: 'Награды',
    showShelf: 'Показать полку',
    hideShelf: 'Скрыть полку',
    todayTitle: 'Цель дня',
    balanceTitle: 'Баланс',
    coinsLabel: 'Монеты',
    gemsLabel: 'Камни',
    ticketsLabel: 'Билеты',
    aiTitle: 'Активность с ИИ',
    dialogueCorrect: 'Верных в диалоге (эта сессия)',
    usageLabel: 'Запросы',
    premiumCue: 'Глубже с ИИ — в Premium',
    nearRewardTitle: 'Ближайшая награда',
    toMyPlan: 'Что делать сейчас →',
    toMyPlanAria: 'Перейти в Мой план',
    emptyTitle: 'Пока нет наград',
    emptyBody: 'Начните в «Мой план» — здесь появится витрина.',
    streakMore: 'Подробнее о серии',
    streakHide: 'Скрыть детали серии',
    recordLabel: 'Рекорд',
    levelToNext: 'до уровня',
    practiceBadgesTitle: 'Бейджи практики',
    practiceTopicsTitle: 'Практика по темам',
    lessonAwardsTitle: 'Награды уроков',
    allBadgeStepsDone: 'Все ступени собраны.',
    needMedalFirst: 'Сначала получите медаль в уроке.',
    modeCommunication: 'Общение',
    modeEngvo: 'Звонок',
    statusCompleted: 'Завершено',
    statusInProgress: 'В процессе',
    statusAbandoned: 'Прервано',
    statusNotStarted: 'Не начато',
    goalDone: 'Готово',
    daysShort: 'дней',
    levelShort: 'ур.',
    goalShort: 'Цель',
  },
} as const

export type ProgressCopy = (typeof SECTIONS)[ProgressAudience]

export function progressCopy(audience: ProgressAudience = 'adult'): ProgressCopy {
  return SECTIONS[audience === 'child' ? 'child' : 'adult']
}

export function progressOpportunityReason(
  reason: 'gems_pending' | 'gold_ring' | 'tier1_ring' | 'tier0_session' | string,
  audience: ProgressAudience,
  cupsEnabled: boolean
): string {
  const child = audience === 'child'
  if (reason === 'gems_pending') {
    return child ? 'Золото есть — практика даст камень.' : 'Золото уже есть — практика закрепит камень.'
  }
  if (reason === 'gold_ring') {
    if (cupsEnabled) {
      return child ? 'Ещё чуть практики — будет кубок.' : 'Золотая медаль и практика по теме — путь к кубку.'
    }
    return child ? 'Практика по золотому уроку — путь к камням.' : 'Золотая медаль и практика — путь к камням.'
  }
  if (reason === 'tier1_ring') {
    return child ? 'Практика приближает к награде.' : 'Практика по теме приближает к награде.'
  }
  return child ? 'Практика даёт опыт к уровню.' : 'Практика по пройденному уроку даёт XP к уровню.'
}

/** Words that must not appear in child hero / section labels (retention). */
export const PROGRESS_CHILD_BANNED_HERO_TERMS = [
  'Premium',
  'заработок',
  '11/12',
  'core',
  'цикл',
  'reinforce',
  'запрос',
] as const
