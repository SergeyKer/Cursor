/**
 * UI copy for tutor chat v1. Keep Russian strings out of AppShell.
 * Card stubs used later by MyPlan «Репетитор» block (Phase 4).
 */

export const TUTOR_CHAT_COPY = {
  panelTitle: 'Репетитор',
  composerPlaceholder: 'Спроси про английский…',
  send: 'Отправить',
  retry: 'Повторить',
  loadingExplain: 'Готовлю ответ…',
  explainFailed: 'Не удалось объяснить. Попробуй ещё раз.',
  clarifyDefault: 'Уточни, что именно непонятно — слово, правило или пример.',

  chipClarify: 'Уточнить',
  chipMicro: 'Закрепить 2 мин',
  chipCheatsheet: 'Шпаргалка',
  chipOtherQuestion: 'Другой вопрос',
  chipDone: 'Готово',
  chipAgain: 'Ещё раз',

  cheatsheetMissing: 'Готовой шпаргалки пока нет — можно закрепить 2 мин или уточнить.',
  cheatsheetUnavailable: 'Шпаргалку сейчас не собрать. Закрепи 2 мин или уточни вопрос.',

  microLoading: 'Собираю проверку…',
  microFailed: 'Не удалось собрать проверку. Попробуй ещё раз.',
  finaleDoneHint: 'Можно вернуться в Уроки.',

  photoReject: 'Это не похоже на школьную тему по английскому.',
  photoBlur: 'Слишком размыто — сделай фото чётче.',
  photoMultiPick: 'Выбери, что разобрать:',
  photoTooLarge: 'Изображение слишком большое. Максимум 6 MB.',
  photoUserLabel: 'Фото',

  /** Phase 1 shell until tutor-explain API (Phase 2). */
  explainShellHold:
    'Принял вопрос. Полный разбор подключим следующим шагом — пока можно уточнить или задать другой вопрос.',
  triagePickGoal: 'Что именно разобрать?',
  triagePickAngle: 'Какой угол выбрать?',
  emptyThreadHint: 'Спроси про правило, слово или пример — разберём здесь.',
  microStart: 'Короткая проверка — выбери ответ:',
  microCorrect: 'Верно.',
  microWrong: 'Не то. Правильный ответ:',
  microUnavailable: 'Пока нечего проверять — сначала нужен разбор.',

  cardSectionTitle: 'Репетитор',
  cardButtonAsk: 'Спросить',
  cardCuriosityFallback: 'Ты спрашивал про эту тему — можно разобрать ещё раз.',
} as const

export type TutorChatCopyKey = keyof typeof TUTOR_CHAT_COPY
