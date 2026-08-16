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
    currentLevelLabel: 'Твой текущий уровень',
    practiceBadgesTitle: 'Бейджи практики',
    practiceTopicsTitle: 'Практика по темам',
    lessonAwardsTitle: 'Награды урока',
    topicsSection: 'Темы',
    topicStepsTitle: 'Ступени практики',
    topicCupTitle: 'К кубку',
    topicCupDone: '🏆 Тема сдана',
    collapseTopic: 'Свернуть',
    startChallengeRow: 'Челлендж',
    lessonBadgesSummary: 'бейджи урока',
    allBadgeStepsDone: 'Все ступени собраны.',
    needMedalFirst: 'Сначала получи медаль в уроке.',
    modeCommunication: 'Общение',
    modeEngvo: 'Звонок',
    statusCompleted: 'Готово',
    statusInProgress: 'В процессе',
    statusAbandoned: 'Прервано',
    statusNotStarted: 'Ещё не начато',
    streakShort: 'Серия',
    levelShort: 'Уровень',
    xpShort: 'XP',
    statusCardTitle: 'Статус',
    saveStreak: 'Вперёд!',
    saveStreakAria: 'Вперёд — открыть Мой план',
    awardsOpen: 'Посмотреть',
    awardsOpenAria: 'Открыть прогресс по урокам и практике',
    toGoalsMyPlan: 'К Моему плану →',
    toGoalsMyPlanAria: 'Открыть Мой план',
    weakZonesTitle: 'Тут путаешься',
    weakZonesEmpty: 'Пока тихо — слабых мест нет',
    weakZoneRepeat: 'Повторить',
    weakZonesCta: 'Исправить',
    weakZonesCtaAria: 'Открыть Мой план',
    remarksTitle: 'Недавние замечания',
    remarksMore: 'Ещё',
    remarksReview: 'Разобрать',
    remarksEmpty: 'Пока тихо — замечания появятся после практики и общения',
    calendarTitle: 'Календарь',
    calendarOpen: 'Открыть',
    calendarDoToday: 'Займись сегодня',
    back: '← Назад',
    myPlanButton: 'Мой план',
    continuePractice: 'Продолжить практику',
    startPractice: 'Начать практику',
    lessonsSection: 'Уроки',
    practiceSection: 'Практика',
    medalNotStarted: 'ещё не начат',
    medalStarted: 'начат',
    modesLesson: 'Урок',
    modesPractice: 'Практика',
    modesChat: 'Общение',
    modesCall: 'Звонок',
    modesPlan: 'План',
    modesReference: 'Справка',
    modesTranslation: 'Перевод',
    modesDialogue: 'Диалог',
    modesVocabulary: 'Слова',
    modesTutor: 'Репетитор',
    modesPronunciation: 'Произношение',
    ritualTitle: 'Звезда дня',
    ritualDailySoon: 'Звезда дня — скоро',
    ritualStreakSoon: '7 дней подряд — скоро',
    ritualRubySoon: 'Рубин за серию — скоро',
    ritualMilestonesSoon: 'Вехи 10 · 50 · 100 · 365 — скоро',
    ritualLaterTail: 'Награды за уровень — позже',
    balanceRubySoon: 'Рубин — скоро',
    balanceDiamondSoon: 'Алмаз — скоро',
    startLessonRow: 'Открыть урок',
    startPracticeRow: 'Практика',
    spaceTitle: 'Прогресс',
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
    currentLevelLabel: 'Ваш текущий уровень',
    practiceBadgesTitle: 'Бейджи практики',
    practiceTopicsTitle: 'Практика по темам',
    lessonAwardsTitle: 'Награды урока',
    topicsSection: 'Темы',
    topicStepsTitle: 'Ступени практики',
    topicCupTitle: 'К кубку',
    topicCupDone: '🏆 Тема сдана',
    collapseTopic: 'Свернуть',
    startChallengeRow: 'Челлендж',
    lessonBadgesSummary: 'бейджи урока',
    allBadgeStepsDone: 'Все ступени собраны.',
    needMedalFirst: 'Сначала получите медаль в уроке.',
    modeCommunication: 'Общение',
    modeEngvo: 'Звонок',
    statusCompleted: 'Завершено',
    statusInProgress: 'В процессе',
    statusAbandoned: 'Прервано',
    statusNotStarted: 'Не начато',
    streakShort: 'Серия',
    levelShort: 'Уровень',
    xpShort: 'XP',
    statusCardTitle: 'Статус',
    saveStreak: 'Вперёд!',
    saveStreakAria: 'Вперёд — открыть Мой план',
    awardsOpen: 'Посмотреть',
    awardsOpenAria: 'Открыть прогресс по урокам и практике',
    toGoalsMyPlan: 'К Моему плану →',
    toGoalsMyPlanAria: 'Открыть Мой план',
    weakZonesTitle: 'На что обратить внимание',
    weakZonesEmpty: 'Пока тихо — слабых мест нет',
    weakZoneRepeat: 'Повторить',
    weakZonesCta: 'К заданиям',
    weakZonesCtaAria: 'Открыть Мой план',
    remarksTitle: 'Недавние замечания',
    remarksMore: 'Ещё',
    remarksReview: 'Разобрать',
    remarksEmpty: 'Пока тихо — замечания появятся после практики и общения',
    calendarTitle: 'Календарь',
    calendarOpen: 'Открыть',
    calendarDoToday: 'Займись сегодня',
    back: '← Назад',
    myPlanButton: 'Мой план',
    continuePractice: 'Продолжить практику',
    startPractice: 'Начать практику',
    lessonsSection: 'Уроки',
    practiceSection: 'Практика',
    medalNotStarted: 'не начат',
    medalStarted: 'начат',
    modesLesson: 'Урок',
    modesPractice: 'Практика',
    modesChat: 'Общение',
    modesCall: 'Звонок',
    modesPlan: 'План',
    modesReference: 'Справка',
    modesTranslation: 'Перевод',
    modesDialogue: 'Диалог',
    modesVocabulary: 'Слова',
    modesTutor: 'Репетитор',
    modesPronunciation: 'Произношение',
    ritualTitle: 'Звезда дня',
    ritualDailySoon: 'Дейлик — скоро',
    ritualStreakSoon: '7 дней подряд — скоро',
    ritualRubySoon: 'Рубин за серию — скоро',
    ritualMilestonesSoon: 'Вехи 10 · 50 · 100 · 365 — скоро',
    ritualLaterTail: 'Награды за уровень и лимиты — позже',
    balanceRubySoon: 'Рубин — скоро',
    balanceDiamondSoon: 'Алмаз — скоро',
    startLessonRow: 'Открыть урок',
    startPracticeRow: 'Практика',
    spaceTitle: 'Прогресс',
  },
} as const

export type ProgressCopy = (typeof SECTIONS)[ProgressAudience]

export function progressCopy(audience: ProgressAudience = 'adult'): ProgressCopy {
  return SECTIONS[audience === 'child' ? 'child' : 'adult']
}

/** 1 раз / 2 раза / 5 раз / 11 раз / 21 раз / 22 раза */
export function ruRazWord(n: number): string {
  const abs = Math.abs(Math.floor(n))
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return 'раз'
  if (mod10 === 1) return 'раз'
  if (mod10 >= 2 && mod10 <= 4) return 'раза'
  return 'раз'
}

export function formatAttentionZoneMeta(sourceHint: string, errorCount: number): string {
  const hint = sourceHint.trim()
  if (errorCount <= 0) return hint
  const count = `${errorCount} ${ruRazWord(errorCount)}`
  return hint ? `${hint} · ${count}` : count
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
      return child ? 'Ещё чуть практики — будет кубок.' : 'Золото есть — практика по теме к кубку.'
    }
    return 'Золото есть — практика даст камни.'
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
