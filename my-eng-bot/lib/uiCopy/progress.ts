import { DAILY_STAR_SERIES_TARGET, type DailyStarClosedBy } from '@/lib/dailyStar/types'
import { PRACTICE_RING_MAX } from '@/lib/practice/practiceGlyphs'

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
    nearRewardTitle: 'Практика',
    toMyPlan: 'Что делать сейчас →',
    toMyPlanAria: 'Открыть Мой план',
    emptyTitle: 'Награды пока пустые',
    emptyBody: 'Зайди в Мой план — там первый шаг.',
    streakMore: 'Подробнее о серии',
    streakHide: 'Скрыть про серию',
    recordLabel: 'Лучший результат',
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
    weakZonesCta: 'Закрепить',
    weakZonesCtaAria: 'Закрепить',
    remarksTitle: 'Что поправить',
    remarksMore: 'Ещё',
    remarksReview: 'Ещё',
    remarksEmpty: 'Пока пусто — появится после практики и общения',
    calendarTitle: 'Календарь',
    calendarOpen: 'Открыть',
    calendarDoToday: 'Займись сегодня',
    calendarDayInStreak: 'День в серии',
    calendarDayNoClosed: 'Закрытых занятий нет',
    calendarDayEmpty: 'Занятий не было',
    calendarNow: 'сейчас',
    calendarMore: 'ещё',
    calendarLessonDone: 'пройден',
    calendarMedalGold: 'золото',
    calendarMedalSilver: 'серебро',
    calendarMedalBronze: 'бронза',
    calendarVocabReviewed: 'повторил',
    calendarVocabLearned: 'выучил',
    back: '← Назад',
    myPlanButton: 'Мой план',
    continuePractice: 'Продолжить практику',
    startPractice: 'Тренировать',
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
    ritualClosed: 'Закрыт',
    ritualOpen: 'Не закрыт',
    ritualHowToGet: 'Как получить',
    ritualLifetime: 'Всего',
    starByCommunication: 'Звезда дня: общение',
    starByTranslation: 'Звезда дня: перевод',
    starByDialogue: 'Звезда дня: диалог',
    starByEngvo: 'Звезда дня: звонок',
    starByPractice: 'Звезда дня: практика',
    starByLesson: 'Звезда дня: урок',
    starByLegacy: 'Звезда дня',
    balanceEconomyLater: 'Рубин/Алмаз — позже',
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
    weakZonesCta: 'Закрепить',
    weakZonesCtaAria: 'Закрепить',
    remarksTitle: 'Недавние ошибки',
    remarksMore: 'Ещё',
    remarksReview: 'К теме',
    remarksEmpty: 'Пока пусто — сюда попадают ошибки из общения, перевода и заданий',
    calendarTitle: 'Календарь',
    calendarOpen: 'Открыть',
    calendarDoToday: 'Займись сегодня',
    calendarDayInStreak: 'День в серии',
    calendarDayNoClosed: 'Закрытых занятий нет',
    calendarDayEmpty: 'Занятий не было',
    calendarNow: 'сейчас',
    calendarMore: 'ещё',
    calendarLessonDone: 'пройден',
    calendarMedalGold: 'золото',
    calendarMedalSilver: 'серебро',
    calendarMedalBronze: 'бронза',
    calendarVocabReviewed: 'повторил',
    calendarVocabLearned: 'выучил',
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
    ritualClosed: 'Закрыт',
    ritualOpen: 'Не закрыт',
    ritualHowToGet: 'Как получить',
    ritualLifetime: 'Всего',
    starByCommunication: 'Звезда дня: общение',
    starByTranslation: 'Звезда дня: перевод',
    starByDialogue: 'Звезда дня: диалог',
    starByEngvo: 'Звезда дня: звонок',
    starByPractice: 'Звезда дня: практика',
    starByLesson: 'Звезда дня: урок',
    starByLegacy: 'Звезда дня',
    balanceEconomyLater: 'Рубин/Алмаз — позже',
    startLessonRow: 'Открыть урок',
    startPracticeRow: 'Практика',
    spaceTitle: 'Прогресс',
  },
} as const

export type ProgressCopy = (typeof SECTIONS)[ProgressAudience]

export const REMARKS_GENRE = {
  phrase: 'разбор фразы',
  task: 'задание',
} as const

export const REMARKS_BODY = {
  chose: 'Выбрал',
  correct: 'Верно',
  need: 'Надо',
  noticed: 'Заметили',
} as const

export function progressCopy(audience: ProgressAudience = 'adult'): ProgressCopy {
  return SECTIONS[audience === 'child' ? 'child' : 'adult']
}

export function formatRitualDayOf7(dayX: number, target = DAILY_STAR_SERIES_TARGET): string {
  const x = Math.max(0, Math.floor(dayX))
  const t = Math.max(1, Math.floor(target))
  return `День ${x} из ${t}`
}

export function ritualStatusLine(closedToday: boolean, copy: ProgressCopy): string {
  return closedToday ? copy.ritualClosed : copy.ritualOpen
}

export function formatDailyStarClosedBy(
  closedBy: DailyStarClosedBy | null | undefined,
  copy: ProgressCopy
): string | null {
  if (!closedBy) return null
  switch (closedBy) {
    case 'communication':
      return copy.starByCommunication
    case 'translation':
      return copy.starByTranslation
    case 'dialogue':
      return copy.starByDialogue
    case 'engvo':
      return copy.starByEngvo
    case 'practice':
      return copy.starByPractice
    case 'lesson':
      return copy.starByLesson
    case 'legacy':
      return copy.starByLegacy
    default:
      return copy.starByLegacy
  }
}

function ruCountWord(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.floor(n))
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

/** 1 раз / 2 раза / 5 раз / 11 раз / 21 раз / 22 раза */
export function ruRazWord(n: number): string {
  return ruCountWord(n, 'раз', 'раза', 'раз')
}

/** 1 зачёт / 2 зачёта / 5 зачётов */
export function ruZachetWord(n: number): string {
  return ruCountWord(n, 'зачёт', 'зачёта', 'зачётов')
}

/** 1 занятие / 2 занятия / 5 занятий */
export function ruZanyatieWord(n: number): string {
  return ruCountWord(n, 'занятие', 'занятия', 'занятий')
}

export function formatAttentionZoneMeta(sourceHint: string, errorCount: number): string {
  const hint = sourceHint.trim()
  if (errorCount <= 0) return hint
  const count = `${errorCount} ${ruRazWord(errorCount)}`
  return hint ? `${hint} · ${count}` : count
}

export function compactOpportunityTopicLabel(
  catalogTitle: string | null | undefined,
  fallback: string
): string {
  const raw = (catalogTitle ?? '').trim() || fallback.trim()
  if (!raw) return fallback.trim()
  const first = raw.split(' / ')[0]?.trim()
  return first || raw
}

export function formatOpportunityTitle(topic: string, showGoldMedal: boolean): string {
  const name = topic.trim()
  return showGoldMedal ? `${name} 🥇` : name
}

function remainingRings(ringCount: number, max = PRACTICE_RING_MAX): number {
  const rings = Math.max(0, Math.min(max, Math.floor(ringCount)))
  return Math.max(0, max - rings)
}

function stillNeedCountPhrase(audience: ProgressAudience, left: number): string {
  if (audience === 'child') return `Ещё ${left} ${ruRazWord(left)}`
  return `Ещё ${left} ${ruZachetWord(left)}`
}

function stillNeedPrizeLine(
  audience: ProgressAudience,
  left: number,
  prizeWhenLeft: string,
  prizeWhenDone: string
): string {
  if (left <= 0) return prizeWhenDone
  return `${stillNeedCountPhrase(audience, left)} — ${prizeWhenLeft}`
}

export function formatOpportunityBodyLine(
  reason: 'gems_pending' | 'gold_ring' | 'tier1_ring' | 'tier0_session' | string,
  audience: ProgressAudience,
  cupsEnabled: boolean,
  ringCount: number
): string {
  const child = audience === 'child'
  const left = remainingRings(ringCount)
  if (reason === 'gems_pending') {
    return child ? 'Забери камень.' : 'Заберите камень.'
  }
  if (reason === 'gold_ring') {
    if (cupsEnabled) {
      return stillNeedPrizeLine(audience, left, 'будет кубок.', 'Следующая практика — кубок.')
    }
    return stillNeedPrizeLine(audience, left, 'будут камни.', 'Следующая практика — камни.')
  }
  if (reason === 'tier1_ring') {
    return stillNeedPrizeLine(
      audience,
      left,
      'ближе к награде.',
      'Практика приближает к награде.'
    )
  }
  return child ? 'Практика даёт опыт к уровню.' : 'Практика даёт XP к уровню.'
}

export function progressOpportunityReason(
  reason: 'gems_pending' | 'gold_ring' | 'tier1_ring' | 'tier0_session' | string,
  audience: ProgressAudience,
  cupsEnabled: boolean,
  ringCount = 0
): string {
  return formatOpportunityBodyLine(reason, audience, cupsEnabled, ringCount)
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
