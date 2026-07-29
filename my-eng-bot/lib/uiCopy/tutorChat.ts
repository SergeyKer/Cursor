/**
 * UI copy for tutor chat v1. Keep Russian strings out of AppShell.
 * Card stubs used later by MyPlan «Репетитор» block (Phase 4).
 */

export type TutorChatAudience = 'child' | 'adult'

const COMPOSER_PLACEHOLDER: Record<TutorChatAudience, string> = {
  child: 'Спроси…',
  adult: 'Спросите…',
}

export function tutorComposerPlaceholder(audience: TutorChatAudience = 'adult'): string {
  return COMPOSER_PLACEHOLDER[audience === 'child' ? 'child' : 'adult']
}

export const TUTOR_CHAT_COPY = {
  panelTitle: 'Репетитор',
  composerPlaceholder: COMPOSER_PLACEHOLDER.child,
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
  photoTake: 'Сделать фото',
  photoPick: 'Выбрать из галереи',
  photoAttachCancel: 'Отмена',
  photoAttachMenuAria: 'Прикрепить фото',

  /** Phase 1 shell until tutor-explain API (Phase 2). */
  explainShellHold:
    'Принял вопрос. Полный разбор подключим следующим шагом — пока можно уточнить или задать другой вопрос.',
  triagePickGoal: 'Что именно разобрать?',
  triagePickAngle: 'Какой угол выбрать?',
  microStart: 'Короткая проверка — выбери ответ:',
  microCorrect: 'Верно.',
  microWrong: 'Не то. Правильный ответ:',
  microUnavailable: 'Пока нечего проверять — сначала нужен разбор.',

  cardSectionTitle: 'Репетитор',
  cardButtonAsk: 'Спросить',
  cardCuriosityFallback: 'Ты спрашивал про эту тему — можно разобрать ещё раз.',

  idleExamplesHeading: 'Пользователи также спрашивают',
  idleBullets: [
    'Напиши любой вопрос по английскому — разберём',
    'Правило, слово, пример из учебника — ок',
    'Спроси: чем отличаются a / an / the',
    'Не знаешь с чего начать — ткни пример ниже',
    'Можно надиктовать или сфоткать задание',
  ],
  idleExampleBank: [
    'Чем отличаются a / an / the?',
    'Когда Present Perfect, а когда Past Simple?',
    'Как сказать «я уже сделал»?',
    'Зачем нужен Present Continuous?',
    'Чем in / on / at отличаются?',
  ],
} as const

export type TutorChatCopyKey = keyof typeof TUTOR_CHAT_COPY

/** Pick up to `count` examples from the bank (stable shuffle by seed). */
export function pickTutorIdleExamples(count = 3, seed = Date.now()): string[] {
  const bank = [...TUTOR_CHAT_COPY.idleExampleBank]
  let s = seed >>> 0
  for (let i = bank.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const j = s % (i + 1)
    const tmp = bank[i]!
    bank[i] = bank[j]!
    bank[j] = tmp
  }
  return bank.slice(0, Math.min(count, bank.length))
}
