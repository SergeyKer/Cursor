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

const MICRO_FINALE_ASK_MORE_ADULT = [
  'Остались вопросы по теме - спрашивайте!',
  'Если что-то непонятно - пишите ниже, разберём.',
  'Хотите уточнить - спрашивайте, я на связи.',
  'Есть ещё вопросы? Смело пишите в поле ниже.',
  'Что-то осталось неясным - спросите, помогу.',
  'По этой теме можно спросить ещё - отвечу.',
  'Не всё уложилось? Напишите ниже - разберём вместе.',
  'Захотите углубиться - спрашивайте в поле ниже.',
  'Вопросы по теме приветствуются - пишите ниже.',
  'Если нужно прояснить детали - спрашивайте!',
] as const

const MICRO_FINALE_ASK_MORE_CHILD = [
  'Остались вопросы по теме - спрашивай!',
  'Если что-то непонятно - пиши ниже, разберём.',
  'Хочешь уточнить - спрашивай, я на связи.',
  'Есть ещё вопросы? Смело пиши в поле ниже.',
  'Что-то осталось неясным - спроси, помогу.',
  'По этой теме можно спросить ещё - отвечу.',
  'Не всё уложилось? Напиши ниже - разберём вместе.',
  'Захочешь углубиться - спрашивай в поле ниже.',
  'Вопросы по теме приветствуются - пиши ниже.',
  'Если нужно прояснить детали - спрашивай!',
] as const

export const TUTOR_CHAT_COPY = {
  panelTitle: 'Репетитор',
  closeAriaLabel: 'Закрыть',
  closeTitle: 'Закрыть',
  composerPlaceholder: COMPOSER_PLACEHOLDER.child,
  send: 'Отправить',
  retry: 'Повторить',
  loadingExplain: 'Готовлю ответ…',
  loadingMicro: 'Готовлю проверку…',
  typingStatus: 'Репетитор печатает...',
  explainFailed: 'Не удалось объяснить. Попробуй ещё раз.',
  clarifyDefault: 'Напиши слово, правило или фразу - разберём.',
  outOfScopeFallback:
    'Похоже, это не про английский. Спроси, как сказать фразу или в чём разница правил - помогу.',
  gateSoftNext: 'Напиши следующий вопрос - слово, правило или фразу.',
  gateHomeworkDump:
    'Работу целиком не делаю. Пришли одно предложение или правило - разберём.',
  gateInsultTeach:
    'Ругательства не разбираем. Спроси нейтральную фразу или правило - например Present Perfect.',
  gateEntertainment:
    'Я репетитор по английскому, не чат. Спроси слово, правило или «как сказать…».',
  gatePersonaMeta: 'Я репетитор по английскому. Спроси тему - слово, правило или фразу.',
  gateProductParent:
    'Я репетитор по языку, не поддержка и не гарантии оценок. Могу разобрать правило или фразу - напиши вопрос.',

  chipMicro: 'Закрепить 2 мин',
  chipCheatsheet: 'Шпаргалка',
  chipDone: 'Готово',
  chipAgain: 'Повторить проверку',

  cheatsheetMissing: 'Готовой шпаргалки пока нет - спроси ещё в поле или открой тему заново.',
  cheatsheetUnavailable: 'Шпаргалку сейчас не собрать. Напиши вопрос в поле.',

  microFailed: 'Не удалось собрать проверку. Попробуй ещё раз.',
  microUnsuitable:
    'Для этой темы короткая проверка не подходит - спроси ещё или открой шпаргалку.',

  microFinaleStrong: (correct: number, total: number) =>
    `${correct} из ${total} - отлично!`,
  microFinaleAskMoreAdult: MICRO_FINALE_ASK_MORE_ADULT,
  microFinaleAskMoreChild: MICRO_FINALE_ASK_MORE_CHILD,
  microFinaleMid: (correct: number, total: number) =>
    `${correct} из ${total} - есть пробелы. Открой шпаргалку или пройди ещё раз.`,
  microFinaleWeak: (correct: number, total: number) =>
    `${correct} из ${total} - тема пока сложная. Посмотри шпаргалку или закрепи ещё раз.`,

  photoReject:
    'На фото не вижу задания по английскому. Сфоткай упражнение или напиши вопрос.',
  photoBlur: 'Слишком размыто - сделай фото чётче.',
  photoMultiPick: 'Выбери, что разобрать:',
  photoTooLarge: 'Изображение слишком большое. Максимум 6 MB.',
  photoUserLabel: 'Фото',
  photoTake: 'Сделать фото',
  photoPick: 'Выбрать из галереи',
  photoAttachCancel: 'Отмена',
  photoAttachMenuAria: 'Прикрепить фото',

  triagePickGoal: (topic: string) => `${topic} - что хочешь разобрать?`,
  triagePickAngle: (term: string) => `${term} - с чего начнём?`,
  microStart: 'Короткая проверка - выбери ответ:',
  microCorrect: 'Верно.',
  microWrong: 'Не то. Правильный ответ:',
  microUnavailable: 'Пока нечего проверять - сначала нужен разбор.',

  cardSectionTitle: 'Репетитор',
  cardButtonAsk: 'Спросить',
  cardCuriosityFallback: 'Ты спрашивал про эту тему - можно разобрать ещё раз.',

  idleExamplesHeading: 'Часто спрашивают',
  idleBulletBank: [
    'Застрял на правиле - спроси своими словами, разберём',
    'Непонятно слово или фраза из учебника - кинь сюда',
    'Чем отличаются два похожих слова - сравним',
    'Как сказать «я уже сделал» по-английски - спроси',
    'Сфоткай один пункт задания - разберём, о чём он',
    'Лень печатать - надиктуй вопрос голосом',
    'Когда Present Perfect, а когда Past Simple - разложим',
    'Почему «an hour», а не «a hour» - объясним',
    'Предлоги in / on / at - на живых примерах',
    'Переведи фразу и скажи, почему так, а не иначе',
    'Не знаешь, с чего начать - выбери пример ниже',
    'После разбора можно закрепить тему за 2 минуты',
    'Нужна короткая памятка - попроси шпаргалку после ответа',
    'Странная форма глагола - разберём, откуда она',
    'Как вежливо попросить / отказаться - подскажем фразу',
    'Ошибка в написании слова - поправим и поясним',
    'Синонимы почти одинаковые - покажем, где какой',
    'Условие упражнения мутное - сфоткай, уточним тему',
    'Частая ошибка в теме - покажем, чтобы не словить',
    'Пример из учебника не бьётся с правилом - разберём',
    '«Что здесь значит это слово?» - разберём в контексте',
    'Какое время поставить - по ситуации, не по таблице',
    'Один вопрос из домашки - разберём точечно',
    'Почему так говорят - разберём нюанс, не только правило',
    'Статья a / an / the - спроси на своём примере',
    'Как сказать естественнее, без кальки с русского',
    'Вопрос из тетради - текстом или фото, как удобнее',
    'Непонятная конструкция в предложении - разберём по частям',
    'Нужно не «теория», а как сказать в жизни - спроси так',
    'Короткий уточняющий вопрос по той же теме - можно сразу',
  ],
  idleExampleBank: [
    'Чем отличаются a / an / the?',
    'Когда Present Perfect, а когда Past Simple?',
    'Как сказать «я уже сделал»?',
    'Зачем нужен Present Continuous?',
    'Чем in / on / at отличаются?',
  ],
} as const

/** «Запомни» for child, «Запомните» for adult. */
export function microFinaleRememberPrefix(audience: TutorChatAudience = 'adult'): string {
  return audience === 'child' ? 'Запомни:' : 'Запомните:'
}

/** Pick one ask-more CTA (stable by seed). */
export function pickMicroFinaleAskMore(
  audience: TutorChatAudience = 'adult',
  seed = Date.now()
): string {
  const bank =
    audience === 'child'
      ? TUTOR_CHAT_COPY.microFinaleAskMoreChild
      : TUTOR_CHAT_COPY.microFinaleAskMoreAdult
  return pickShuffledSlice(bank, 1, seed)[0]!
}

/** Strong micro finale: score + optional remember, then ask-more CTA. */
export function buildMicroStrongFinaleText(params: {
  correct: number
  total: number
  audience?: TutorChatAudience
  rememberRu?: string | null
  seed?: number
}): string {
  const audience = params.audience === 'child' ? 'child' : 'adult'
  const score = TUTOR_CHAT_COPY.microFinaleStrong(params.correct, params.total)
  const askMore = pickMicroFinaleAskMore(audience, params.seed)
  const remember = params.rememberRu?.trim()
  if (!remember) {
    return `${score}\n\n${askMore}`
  }
  const prefix = microFinaleRememberPrefix(audience)
  return `${score}\n${prefix} ${remember}\n\n${askMore}`
}

/** Chip labels for local triage (B / C / meta). */
export const TUTOR_TRIAGE_CHIP_LABELS = {
  narrowB: ['Зачем это', 'Как строится', 'Чем отличается', 'Частые ошибки'],
  broadC: ['Когда какой', 'Когда ставить', 'Частые ошибки', 'Пример'],
  shortC: ['Что значит', 'Как сказать', 'Какая форма', 'Пример'],
  metaC: ['Слово', 'Правило', 'Как сказать', 'Пример'],
} as const

export type TutorChatCopyKey = keyof typeof TUTOR_CHAT_COPY

function pickShuffledSlice(source: readonly string[], count: number, seed: number): string[] {
  const bank = [...source]
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

/** Pick up to `count` idle thesis lines from the bank (stable shuffle by seed). */
export function pickTutorIdleBullets(count = 3, seed = Date.now()): string[] {
  return pickShuffledSlice(TUTOR_CHAT_COPY.idleBulletBank, count, seed)
}

/** Pick up to `count` examples from the bank (stable shuffle by seed). */
export function pickTutorIdleExamples(count = 3, seed = Date.now()): string[] {
  return pickShuffledSlice(TUTOR_CHAT_COPY.idleExampleBank, count, seed)
}
