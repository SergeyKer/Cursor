import {
  ENGVO_NETWORK_USER_MESSAGE,
  ENGVO_RATE_LIMIT_USER_MESSAGE,
  ENGVO_SESSION_CONFIG_USER_MESSAGE,
} from '@/lib/engvo/errors'

/** Сообщения-ошибки и системные ответы, которые не следует подмешивать в replay Realtime. */
export function isErrorLikeAssistantMessage(content: string): boolean {
  const trimmed = content.trim()
  return (
    content === 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.' ||
    content.startsWith('ИИ не отвечает') ||
    content.startsWith('Модель вернула некорректный ответ') ||
    content.startsWith('Модель вернула пустой ответ') ||
    content.startsWith('Диалог слишком длинный') ||
    content.startsWith('Ответ занял слишком много времени') ||
    content.startsWith('Загрузка занимает слишком много времени') ||
    content.startsWith('Не удалось получить ответ') ||
    content.includes('OPENROUTER_API_KEY') ||
    content.startsWith('Неверный ключ') ||
    content.startsWith('Превышен лимит') ||
    content.startsWith('Сервис ИИ временно') ||
    content.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»') ||
    content.startsWith('Слишком много запросов к ИИ') ||
    content.startsWith('Сейчас ИИ недоступен') ||
    trimmed === ENGVO_SESSION_CONFIG_USER_MESSAGE ||
    trimmed === ENGVO_RATE_LIMIT_USER_MESSAGE ||
    trimmed === ENGVO_NETWORK_USER_MESSAGE ||
    content.startsWith('Не удалось настроить голосовую сессию') ||
    content.startsWith('Не удалось подключиться к голосовому сервису') ||
    content.startsWith('Слишком много запросов к голосовому сервису') ||
    content.startsWith('Не удалось начать звонок Engvo') ||
    content.startsWith('Не удалось установить медиа-соединение') ||
    content.startsWith('Канал управления Realtime не открылся') ||
    content.startsWith('OpenAI не подтвердил Realtime-сессию') ||
    content.startsWith('Соединение Engvo прервалось') ||
    content.startsWith('Не удалось получить доступ к микрофону') ||
    content.startsWith('Ошибка Realtime') ||
    content.includes("Missing required parameter") ||
    content.includes('session.type')
  )
}
