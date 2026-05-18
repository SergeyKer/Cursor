import type { LessonTipCategory } from '@/lib/lessonExtraTips'

/** Shared rules for all cards' examples[1] (third interactive UI block). */
export const THIRD_BLOCK_SHARED_SYSTEM_LINES = [
  'Для examples[1] (3-й интерактивный блок): мини-задание на 10-30 сек, игровой тон, 0% академизма, строго по topic и tutorIntent.',
  'В note — только русский, до ~15 слов, без эмодзи ✓/💡 в тексте (UI не добавляет префиксы).',
  'Не дублируй examples[0] на той же карточке. Не используй универсальные учебные фразы вне темы.',
  'Если mode=refresh, для examples[1] смени тип мини-задания или другой right, а не косметический рерайт.',
] as const

export const THIRD_BLOCK_SYSTEM_BY_CATEGORY: Record<LessonTipCategory, readonly string[]> = {
  native_speech: [
    'native_speech examples[1] = UI "⚡ Быстрый приём": UI показывает "Попробуй заменить:" + wrong, после клика — right и note.',
    'wrong: ровно ОДНО EN-предложение, 8-12 слов, учебниковое/длинное по topic (не русский, не два предложения).',
    'right: тот же смысл, короче и разговорнее (сокращение, чанк, порядок слов).',
    'note: лайфхак как сделать — "Используй can\'t", "Убери would like" — без теории.',
    'Выбери ОДИН тип под topic: сократи / замени сокращением / перефразируй короче / вставь пропущенное слово (если уместно).',
    'ЗАПРЕЩЕНО: повторять пару из examples[0]; wrong на русском; фразы "Can you explain the rule", "How does this pattern work".',
  ],
  russian_traps: [
    'russian_traps examples[1] = UI "⚡ Проверка за 3 секунды — выбери": две кнопки = right (правильный) + автодистрактор из right (Who like / to reads / …s).',
    'wrong для examples[1] оставь пустым — UI его не показывает.',
    'right: короткая правильная EN-фраза, 6-10 слов, по topic; дистрактор должен быть правдоподобной типичной ошибкой.',
    'Предпочитай Who … likes …? / It\'s time to … / I know what she likes. / to + verb — код строит ошибку согласования, формы или порядка слов.',
    'Для встроенных вопросов: right = I know what she likes. / Tell me where the station is. — дистрактор с does или where is.',
    'Избегай right, где дистрактор = бессмысленное …s в конце (Thanks → Thankss).',
    'note: "Потому что …" на русском, 5-12 слов — объясняет выбор при ✅ и при ❌.',
  ],
  questions_negatives: [
    'questions_negatives examples[1] = UI "✅ Фикс за 5 секунд": на экране только right (шаблон-якорь); note/wrong — резерв для кэша.',
    'right: один запоминаемый EN-шаблон по topic, до 10 слов, сразу применим (Do you…? / She doesn\'t… / Are you…? для to be).',
    'note: короткий практический приём на русском (резерв, UI пока не показывает).',
    'Для to be: Are you… / She isn\'t… — не Do you. Для Present Simple: Do/Does + subject + verb. Для встроенных: Do you know what she likes?',
  ],
  emphasis_emotion: [
    'emphasis_emotion examples[1] = блок 2 "💬 Живые примеры" (не 3-й UI-блок "Быстрый приём" — он захардкожен в UI).',
    'examples[1]: wrong = нейтральная фраза по topic, right = та же с уместным усилителем (really/so/definitely или по теме), note = когда звучит естественно.',
    'Усилители подбирай по topic, не копируй один набор для всех уроков.',
  ],
  context_culture: [
    'context_culture examples[1] = UI "✅ Правило выбора": после клика note (правило) крупно, затем right (пример).',
    'note: правило "Если … — …" на русском, до 15 слов (чат vs работа / друг vs начальник).',
    'right: одна EN-фраза, 8-12 слов — лучший вариант для одной из ситуаций.',
    'wrong опционален (UI не показывает до клика).',
  ],
}

export function buildThirdBlockSystemLines(): string[] {
  return [
    ...THIRD_BLOCK_SHARED_SYSTEM_LINES,
    ...THIRD_BLOCK_SYSTEM_BY_CATEGORY.native_speech,
    ...THIRD_BLOCK_SYSTEM_BY_CATEGORY.russian_traps,
    ...THIRD_BLOCK_SYSTEM_BY_CATEGORY.questions_negatives,
    ...THIRD_BLOCK_SYSTEM_BY_CATEGORY.emphasis_emotion,
    ...THIRD_BLOCK_SYSTEM_BY_CATEGORY.context_culture,
  ]
}

export const THIRD_BLOCK_JSON_SHAPE_EXAMPLES: Record<
  LessonTipCategory,
  { wrong: string; right: string; note: string }
> = {
  native_speech: {
    wrong: 'ONE textbook/long EN sentence (8-12 words) for "Попробуй заменить"',
    right: 'shorter spoken EN with same meaning after the quick trick',
    note: 'Russian lifehack how to transform wrong→right, max ~15 words, no theory',
  },
  russian_traps: {
    wrong: 'leave empty — UI does not show wrong in 3-second check',
    right: 'correct short EN phrase; must yield plausible auto-distractor (Who likes / time to / to+verb)',
    note: 'Russian "Потому что …" feedback for correct and wrong tap, 5-12 words',
  },
  questions_negatives: {
    wrong: 'optional reserve — UI shows only right on reveal',
    right: 'memorable EN checkpoint template for this topic, max ~10 words',
    note: 'Russian 5-second fix reserve (UI may not show yet)',
  },
  emphasis_emotion: {
    wrong: 'neutral phrase for block 2 live examples',
    right: 'same phrase with natural booster for this topic',
    note: 'short Russian: when this booster fits',
  },
  context_culture: {
    wrong: 'optional second EN line — not shown before reveal',
    right: 'best EN phrase for one situation (chat or work)',
    note: 'Russian if/then style rule, max ~15 words — shown first on reveal',
  },
}
