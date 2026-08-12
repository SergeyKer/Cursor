/** Экраны внутри «Чат с Engvo» (сводка и drill-down). */
export type AiChatPanel =
  | 'summary'
  | 'mode'
  | 'audience'
  | 'tense'
  | 'sentenceType'
  | 'topic'
  | 'level'
  | 'translationFocus'
  | 'tts'
  | 'voice'
  | 'voiceRotation'
  | 'voiceSection'

/** Подсказки у робота (узкая колонка на iPhone - до ~3 строк). Без призывов к действию. */
export const AI_CHAT_PANEL_HINTS: Record<AiChatPanel, string> = {
  summary: 'Ниже: режим, тема, уровень. ИИ и голос - в «Настройки».',
  mode: 'Чат, диалог по сценарию или перевод.',
  audience: 'Стиль ответов: ребёнок или взрослый.',
  tense: 'Время глагола в диалоге и переводе.',
  sentenceType: 'Тип фраз в ответах для этого режима.',
  topic: 'Тема - контекст диалога или перевода.',
  level: 'Сложность лексики и грамматики.',
  translationFocus: 'Время глагола или грамматика урока.',
  tts: 'Системный голос устройства или Grok.',
  voice: 'Голос Grok для автоозвучки чата.',
  voiceRotation: 'Случайный голос или один выбранный.',
  voiceSection: 'Голос из выбранной группы.',
}
