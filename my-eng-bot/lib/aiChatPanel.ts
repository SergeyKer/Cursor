/** Экраны внутри «Чат с MyEng» (сводка и drill-down). */
export type AiChatPanel =
  | 'summary'
  | 'mode'
  | 'audience'
  | 'tense'
  | 'sentenceType'
  | 'topic'
  | 'level'
  | 'provider'
  | 'voice'

/** Подсказки у робота (узкая колонка на iPhone — до ~3 строк). Без призывов к действию. */
export const AI_CHAT_PANEL_HINTS: Record<AiChatPanel, string> = {
  summary: 'Ниже в меню: режим, тема, уровень и параметры.',
  mode: 'Чат, диалог по сценарию или перевод.',
  audience: 'Стиль ответов: ребёнок или взрослый.',
  tense: 'Время глагола в диалоге и переводе.',
  sentenceType: 'Тип фраз в ответах для этого режима.',
  topic: 'Тема — контекст диалога или перевода.',
  level: 'Сложность лексики и грамматики.',
  provider: 'Какая нейросеть отвечает в чате.',
  voice: 'Голос озвучки при включённой речи.',
}
