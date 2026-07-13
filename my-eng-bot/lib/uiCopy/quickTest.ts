/** Русский copy быстрого теста. Не дублировать строки в компонентах. */

export const QUICK_TEST_COPY = {
  headerTitle: 'Engvo AI - English Voice',
  menuLabel: 'Быстрый тест',

  greetingLine2:
    'Быстрый тест: 2 минуты · 5 вопросов · без регистрации. Выбери уровень.',

  pickLevelDynamic: 'Выбери уровень',
  pickTopicDynamic: 'Выбери тему',
  pickAnswerDynamic: 'Выбери ответ',
  pickTopicBubble: 'Выбери тему',
  topicsFooterHint: 'Лёгкие и полезные',
  frozenLevelBubble: 'Этот уровень скоро. Пока попробуй A2.',
  frozenChipHint: 'скоро',
  dontKnowChip: 'Не знаю — начнём с лёгкого',

  staticLobby: 'Быстрый тест | 5 вопросов',
  stepLabel: (n: number, total: number) => `Шаг ${n} из ${total}`,
  feedbackCorrect: 'Верно',
  feedbackWrong: 'Разберём',
  next: 'Дальше',
  result: 'Результат',
  exitLabel: 'Выйти из теста',
  exitConfirm: 'Выйти из теста? Прогресс этого прогона сбросится.',
  exitConfirmYes: 'Выйти',
  exitConfirmNo: 'Остаться',

  footerCorrect: 'Отлично',
  footerAlmost: 'Почти',
  footerWhy: 'Смотри почему',
  footerChecking: 'Проверяю…',

  lobbyMessages: [
    'Привет! Меня зовут Engvo AI.',
    'Ты здесь наверняка потому что хочешь быстро проверить, как у тебя с английским — без регистрации и длинных уроков.',
    'Давай вместе пообщаемся и посмотрим, как ты умеешь болтать по-английски. Пройдём короткий тест: выбери уровень и тему — и поехали.',
  ] as const,

  finaleTitlePerfect: 'Без ошибок',
  finaleTitleStrong: 'Сильный результат',
  finaleTitleStart: 'Нормальный старт',
  finaleCtaPerfect: 'Закрепить тему в уроке',
  finaleCtaStrong: 'Разобрать ошибку в уроке',
  finaleCtaStart: 'Пройти тему в уроке с нуля',
  finalePerfectHint: 'В тесте — выбор. В уроке — применение и настоящая медаль.',
  finaleShare: 'Поделиться',
  finaleAnotherVariant: 'Ещё вариант',
  finaleOtherTest: 'Другой тест',
  finaleScore: (correct: number, total: number) => `${correct} из ${total}`,
  finaleErrorsHeading: 'На что обратить внимание',

  footerFinalePerfect: 'Идеально',
  footerFinaleStrong: 'Сильный результат',
  footerFinaleStart: 'Нормальный старт',

  shareCopied: 'Текст скопирован — вставь в чат другу',
  shareClipboardFallback: 'Скопируйте адрес из строки браузера',
  lessonMissingNotice: 'Урок скоро. Пока выбери другой тест.',

  levelLabels: {
    A1: 'A1 - начальный',
    A2: 'A2 - элементарный',
    B1: 'B1 - средний',
    B2: 'B2 - выше среднего',
  } as const,
} as const

export function buildQuickTestGreeting(): string {
  return QUICK_TEST_COPY.lobbyMessages.join('\n\n')
}

export function buildQuickTestLobbyMessages(): readonly string[] {
  return QUICK_TEST_COPY.lobbyMessages
}

export function buildShareChallengeText(input: {
  topicTitle: string
  correct: number
  total: number
  durationLabel: string
  absoluteUrl: string
}): string {
  return [
    `Я прошёл быстрый тест Engvo по теме «${input.topicTitle}» — ${input.correct}/${input.total} за ${input.durationLabel}.`,
    `Сможешь лучше? ${input.absoluteUrl}`,
  ].join('\n')
}
