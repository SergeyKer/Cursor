type LessonRepeatFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_steps'

export const APP_SHELL_HOME_COPY = {
  audienceChildLabel: 'Я - ребёнок',
  audienceAdultLabel: 'Я - взрослый',
  homeBackAriaLabel: 'Главная: вернуться к выбору ребёнок или взрослый',
  homeBackLabel: 'Главная',
  lessonsLabel: 'Уроки',
  practiceLabel: 'Практика',
  communicationLabel: 'Общение',
  startChatLabel: 'Начать чат с Engvo AI',
  startMyPlanLabel: 'Мой план',
  startReferenceLabel: 'Справочник',
  doorTitle: 'Сейчас',
  doorBodyChild: 'Один шаг — и урок начнётся.',
  doorBodyAdult: 'Один шаг — урок или план на сегодня.',
  doorPlay: 'Играть',
  doorStart: 'Начать',
  sectionsLabel: 'Разделы',
  sectionsHint: 'Уроки, практика, чат.',
  sectionNowHint: 'Шаг на сегодня.',
  sectionWordsHint: 'Миры и списки.',
  sectionPronunciationHint: 'Звуки и акцент.',
  sectionTutorHint: 'Вопросы по английскому.',
  sectionLessonsHint: 'Темы и уровни.',
  sectionPracticeHint: 'Диалог, перевод, тесты.',
  sectionTalkHint: 'Чат и звонок.',
  sectionReferenceHint: 'Правила и фразы.',
  sectionProgressHint: 'Пройденное и ошибки.',
  sectionProfileHint: 'Имя и уровень.',
  sectionSettingsHint: 'Тема, голос, ИИ.',
  nestedChatHint: 'Писать и говорить.',
  nestedCallHint: 'Разговор голосом.',
  nestedPracticeByLessonHint: 'Упражнения к уроку.',
  nestedDialogueHint: 'Разговор по теме.',
  nestedTranslationHint: 'Фраза туда-обратно.',
  nestedTeacherHint: 'Голосовой разбор.',
  nestedPhrasebookHint: 'Скоро.',
  nestedQuickTestHint: 'Короткая проверка.',
  nestedByLevelHint: 'Ступени A1–C2.',
  nestedByTopicHint: 'Грамматика и навыки.',
} as const

export const APP_SHELL_ERROR_COPY = {
  retryMessages: ['Пробую ещё раз…', 'Вот-вот, почти!'] as const,
  errorFirstMessage: 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.',
  emptyResponseFallback: 'ИИ не отвечает. Проверьте сеть и попробуйте снова.',
} as const

export function getMenuGenerationFallbackMessage(reason: LessonRepeatFallbackReason | undefined): string {
  if (reason === 'provider') {
    return 'Проблема с доступом к модели. Попробуйте сгенерировать урок ещё раз.'
  }
  if (reason === 'parse') {
    return 'Модель вернула ответ не в том формате. Попробуйте сгенерировать урок ещё раз.'
  }
  if (reason === 'validation') {
    return 'Модель сгенерировала урок низкого качества. Повторите генерацию.'
  }
  if (reason === 'no_steps') {
    return 'Для этого урока пока нет шагов для генерации.'
  }
  return 'Не удалось сгенерировать новый урок. Попробуйте ещё раз.'
}
