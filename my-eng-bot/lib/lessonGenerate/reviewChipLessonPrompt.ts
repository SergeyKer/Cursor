import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import { parseReviewTopicTitle } from '@/lib/languageNote/resolveReviewChipTopic'

/** Permanent high-frequency etalons — copy structure, NOT the topic unless user asked for it. */
const ETALON_FEW_SHOTS = [
  'Few-shot density (copy structure, NOT the topic unless it matches user EN-anchor):',
  '',
  '1) the:',
  '{"intro":{"topic":"the","kind":"structure","complexity":"simple","quick":{"why":["Перед «тем самым» местом часто нужен the: the cinema, the park.","Голый cinema без артикля звучит обрубленно, когда речь про кинотеатр."],"how":["to the + place → I go to the cinema.","at the + place → We meet at the cinema."],"examples":[{"en":"I go to the cinema.","ru":"Я хожу в кино.","note":"the + cinema"},{"en":"Let\'s meet at the station.","ru":"Давай встретимся на вокзале.","note":"the + station"},{"en":"The film starts at 7.","ru":"Фильм начинается в 7.","note":"the film"}],"takeaway":"Перед знакомым местом часто the — не go to cinema."},"deepDive":{"commonMistakes":["Не I go to cinema — а I go to the cinema.","Не in cinema как «в кинотеатре» без артикля — проверь the."],"selfCheckRule":"Это «то самое» место/фильм из контекста? → часто нужен the."},"learningPlan":{"grammarFocus":["the + place"],"firstPracticeGoal":"Скажи 3 фразы: to the … / at the …"}}}',
  '',
  '2) cat / cats:',
  '{"intro":{"topic":"cat / cats","kind":"contrast","complexity":"simple","quick":{"why":["Один предмет — форма без -s: a cat.","Два и больше — обычно + -s: cats, books."],"how":["one / a + cat → one cat.","two / many + cats → two cats."],"examples":[{"en":"I have two cats.","ru":"У меня две кошки.","note":"мн. -s"},{"en":"This is a cat.","ru":"Это кошка.","note":"ед."},{"en":"How many cats do you have?","ru":"Сколько у тебя кошек?","note":"many + мн."}],"takeaway":"Один — cat; много — cats."},"deepDive":{"commonMistakes":["Не two cat — а two cats.","Не a cats — а a cat."],"contrastNotes":["Есть особые мн. (children, mice) — учи отдельно; база — + -s."],"selfCheckRule":"Это один или больше? Больше → почти всегда -s."},"learningPlan":{"grammarFocus":["singular vs plural -s"],"contrastPair":["cat","cats"],"firstPracticeGoal":"Скажи 3 пары: one … / two …s."}}}',
  '',
  '3) I don\'t:',
  '{"intro":{"topic":"I don\'t","kind":"structure","complexity":"simple","quick":{"why":["После I / you / we / they отрицание: don\'t + глагол.","Не I doesn\'t — doesn\'t только для he/she/it."],"how":["I don\'t + V → I don\'t believe…","He/She doesn\'t + V → She doesn\'t believe…"],"examples":[{"en":"Yes, I don\'t believe in UFOs.","ru":"Да, я не верю в НЛО.","note":"I + don\'t"},{"en":"I don\'t know.","ru":"Я не знаю.","note":"don\'t + V"},{"en":"She doesn\'t know.","ru":"Она не знает.","note":"she → doesn\'t"}],"takeaway":"После I — don\'t, не doesn\'t."},"deepDive":{"commonMistakes":["Не I doesn\'t believe — а I don\'t believe.","Не I don\'t believes — а I don\'t believe."],"selfCheckRule":"Замени I на he: если нужен doesn\'t — с I ставь don\'t."},"learningPlan":{"grammarFocus":["I don\'t + verb"],"firstPracticeGoal":"Скажи 3 отрицания с I don\'t."}}}',
  '',
  '4) believe in:',
  '{"intro":{"topic":"believe in","kind":"structure","complexity":"simple","quick":{"why":["«Верить в …» по-английски: believe in + то, во что веришь.","Без in фраза часто звучит обрубленно или меняет смысл."],"how":["believe in + N → I believe in UFOs.","don\'t believe in + N → I don\'t believe in ghosts."],"examples":[{"en":"Yes, I don\'t believe in UFOs.","ru":"Да, я не верю в НЛО.","note":"believe in"},{"en":"I believe in you.","ru":"Я в тебя верю.","note":"человек"},{"en":"She believes in magic.","ru":"Она верит в магию.","note":"believes in"}],"takeaway":"Верить в … = believe in + N."},"deepDive":{"commonMistakes":["Не I believe UFO — а I believe in UFOs.","Не I believe ghosts — а I believe in ghosts."],"contrastNotes":["believe that + предложение: I believe that it\'s true — другой шаблон."],"selfCheckRule":"По-русски «верить в …»? → ставь in после believe."},"learningPlan":{"grammarFocus":["believe in + noun"],"firstPracticeGoal":"Скажи 3 фразы: I believe in … / I don\'t believe in …"}}}',
].join('\n')

export function buildReviewChipLessonSystemPrompt(): string {
  return [
    'Ты методист английского для Engvo / MyEng.',
    'Верни ТОЛЬКО JSON lesson blueprint для короткой шпаргалки (intro + theoryIntro + actions/followups как в обычном blueprint).',
    'theoryIntro строго с заголовками: **Урок:** **Правило:** **Примеры:** **Коротко:** **Шаблоны:**',
    'Формат intro:',
    '{"topic":"строка","kind":"single_rule|contrast|concept|tense|structure","complexity":"simple|medium|advanced","quick":{"why":["до 3"],"how":["до 3"],"examples":[{"en":"...","ru":"...","note":"..."}],"takeaway":"..."},"details":{"points":["2-3"]},"deepDive":{"commonMistakes":["Не X — а Y"],"contrastNotes":["..."],"selfCheckRule":"..."},"learningPlan":{"grammarFocus":["..."],"contrastPair":["A","B"],"firstPracticeGoal":"Скажи 3 фразы..."}}',
    '',
    'ANTI-HALLUCINATION (критично):',
    '- intro.topic = ровно EN-anchor из user (не gloss, не hash, не строки с ::).',
    '- Учи ТОЛЬКО EN-anchor. Gloss — подсказка смысла, не новая тема.',
    '- Фокус чипа: why/how/takeaway/mistakes — только про EN-anchor. Другие правки в «Как правильно» не объясняй (соседний чип).',
    '- Ядро = контраст «Ошибка ученика» → «Как правильно» под этим якорем. Первый example ≈ эта пара (или очень близко), без урока про соседнюю грамматику.',
    '- Не уводи в соседнюю грамматику (якорь the — не разворачивай at/in; якорь I don\'t — не разворачивай believe in).',
    '- Не редкие exceptions, не «всегда/никогда», не академические ярлыки, не выдуманные формы.',
    '- Только A1–A2 high-frequency. Не уверен — меньше пунктов.',
    '- Если в теме A / B — kind=contrast; оба якоря в how/examples/mistakes; contrastPair обязателен.',
    '- Не противоречь «Почему (из подсказки)» по якорю чипа.',
    '- Текст секций на русском; EN только в примерах и шаблонах.',
    '- intro.quick короткий, без инфошума.',
    '- Не копируй topic из few-shot, если user-якорь другой.',
    '',
    ETALON_FEW_SHOTS,
  ].join('\n')
}

export function buildReviewChipLessonUserPayload(params: {
  chip: LanguageNoteReviewTopic
  note: LanguageNote
}): string {
  const { topic, gloss } = parseReviewTopicTitle(params.chip.title)
  const anchor = topic || params.chip.title
  const reasons = params.note.correctReasons.slice(0, 2).filter(Boolean)
  return [
    `Тема (EN-anchor): ${anchor}`,
    gloss ? `Gloss: ${gloss}` : '',
    `Фокус чипа: «${anchor}». Не учи другие темы из той же фразы.`,
    `Ошибка ученика: ${params.note.original}`,
    `Как правильно: ${params.note.correct}`,
    reasons.length ? `Почему (из подсказки):\n${reasons.map((r, i) => `${i + 1}) ${r}`).join('\n')}` : '',
    'Собери шпаргалку, которая объясняет именно этот контраст под данным EN-anchor.',
    'intro.topic должен быть равен EN-anchor выше.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildReviewChipCacheTopicKey(chipTitle: string, original: string, correct: string): string {
  const { topic } = parseReviewTopicTitle(chipTitle)
  const pair = `${original.trim()}|${correct.trim()}`
  let hash = 0
  for (let i = 0; i < pair.length; i++) {
    hash = (hash * 31 + pair.charCodeAt(i)) | 0
  }
  return `${topic || chipTitle.trim()}::${hash.toString(36)}`
}

/** Server cache topic-part for language_note_review (namespace avoids tutor/"the" collisions). */
export function buildReviewChipNamespacedCacheTopic(
  chipTitle: string,
  original: string,
  correct: string
): string {
  return `review:${buildReviewChipCacheTopicKey(chipTitle, original, correct)}`
}
