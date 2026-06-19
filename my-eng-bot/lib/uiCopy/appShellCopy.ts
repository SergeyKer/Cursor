type LessonRepeatFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_steps'

export const APP_SHELL_HOME_COPY = {
  audienceChildLabel: 'Я - ребёнок',
  audienceAdultLabel: 'Я - взрослый',
  homeBackAriaLabel: 'Главная: вернуться к выбору ребёнок или взрослый',
  homeBackLabel: 'Главная',
  startChatLabel: 'Начать чат с Engvo AI',
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
