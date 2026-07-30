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
  clarifyDefault: 'Напиши слово, правило или фразу — разберём.',
  outOfScopeFallback:
    'Похоже, это не про английский. Спроси, как сказать фразу или в чём разница правил — помогу.',
  gateSoftNext: 'Напиши следующий вопрос — слово, правило или фразу.',
  gateHomeworkDump:
    'Работу целиком не делаю. Пришли одно предложение или правило — разберём.',
  gateInsultTeach:
    'Ругательства не разбираем. Спроси нейтральную фразу или правило — например Present Perfect.',
  gateEntertainment:
    'Я репетитор по английскому, не чат. Спроси слово, правило или «как сказать…».',
  gatePersonaMeta: 'Я репетитор по английскому. Спроси тему — слово, правило или фразу.',
  gateProductParent:
    'Я репетитор по языку, не поддержка и не гарантии оценок. Могу разобрать правило или фразу — напиши вопрос.',

  chipMicro: 'Закрепить 2 мин',
  chipCheatsheet: 'Шпаргалка',
  chipDone: 'Готово',
  chipAgain: 'Ещё раз',

  cheatsheetMissing: 'Готовой шпаргалки пока нет — можно закрепить 2 мин или спросить в поле.',
  cheatsheetUnavailable: 'Шпаргалку сейчас не собрать. Закрепи 2 мин или напиши вопрос в поле.',

  microFailed: 'Не удалось собрать проверку. Попробуй ещё раз.',

  microFinaleStrong: (correct: number, total: number) =>
    `${correct} из ${total} — отлично. Можно спросить ещё в поле ниже.`,
  microFinaleMid: (correct: number, total: number) =>
    `${correct} из ${total} — есть пробелы. Открой шпаргалку или пройди ещё раз.`,
  microFinaleWeak: (correct: number, total: number) =>
    `${correct} из ${total} — тема пока сложная. Посмотри шпаргалку или закрепи ещё раз.`,

  photoReject:
    'На фото не вижу задания по английскому. Сфоткай упражнение или напиши вопрос.',
  photoBlur: 'Слишком размыто — сделай фото чётче.',
  photoMultiPick: 'Выбери, что разобрать:',
  photoTooLarge: 'Изображение слишком большое. Максимум 6 MB.',
  photoUserLabel: 'Фото',
  photoTake: 'Сделать фото',
  photoPick: 'Выбрать из галереи',
  photoAttachCancel: 'Отмена',
  photoAttachMenuAria: 'Прикрепить фото',

  triagePickGoal: (topic: string) => `${topic} — что хочешь разобрать?`,
  triagePickAngle: (term: string) => `${term} — с чего начнём?`,
  microStart: 'Короткая проверка — выбери ответ:',
  microCorrect: 'Верно.',
  microWrong: 'Не то. Правильный ответ:',
  microUnavailable: 'Пока нечего проверять — сначала нужен разбор.',

  cardSectionTitle: 'Репетитор',
  cardButtonAsk: 'Спросить',
  cardCuriosityFallback: 'Ты спрашивал про эту тему — можно разобрать ещё раз.',

  idleExamplesHeading: 'Часто спрашивают',
  idleBullets: [
    'Напиши любой вопрос по английскому — разберём',
    'Правило, слово, пример из учебника — ок',
    'Спроси: чем отличаются a / an / the',
    'Не знаешь с чего начать — выбери пример ниже',
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

/** Chip labels for local triage (B / C / meta). */
export const TUTOR_TRIAGE_CHIP_LABELS = {
  narrowB: ['Зачем это', 'Как строится', 'Чем отличается', 'Частые ошибки'],
  broadC: ['Когда какой', 'Когда ставить', 'Частые ошибки', 'Пример'],
  shortC: ['Что значит', 'Как сказать', 'Какая форма', 'Пример'],
  metaC: ['Слово', 'Правило', 'Как сказать', 'Пример'],
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
