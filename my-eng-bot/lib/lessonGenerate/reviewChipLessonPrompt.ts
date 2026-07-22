import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import { parseReviewTopicTitle } from '@/lib/languageNote/resolveReviewChipTopic'

/** Compact etalon density — pedagogy of structured intros 1–4, not a full lesson copy. */
const ETALON_DENSITY_FEW_SHOT = [
  'Few-shot density (copy structure, NOT the topic):',
  '{',
  '  "intro": {',
  '    "topic": "I am / I am from",',
  '    "kind": "structure",',
  '    "complexity": "simple",',
  '    "quick": {',
  '      "why": ["Про себя говори через I am — не I is.", "После am одно: имя, откуда или роль."],',
  '      "how": ["I am + имя → I am Anna.", "I am from + место → I am from Moscow."],',
  '      "examples": [{"en":"I am Anna.","ru":"Я Анна.","note":"имя"},{"en":"I am from Russia.","ru":"Я из России.","note":"откуда"}],',
  '      "takeaway": "Про себя через I am: имя, откуда, роль."',
  '    },',
  '    "deepDive": {',
  '      "commonMistakes": ["Не I Anna — а I am Anna.", "Не I am from in Russia — а I am from Russia."],',
  '      "selfCheckRule": "По-русски «я Анна» ок; по-английски без am фраза оборвана."',
  '    },',
  '    "learningPlan": { "grammarFocus": ["I am + name/from"], "firstPracticeGoal": "Скажи 3 фразы: кто / откуда / какой." }',
  '  }',
  '}',
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
    '- Учи ТОЛЬКО EN-anchor темы из user payload. Gloss — подсказка смысла, не новая тема.',
    '- Ядро шпаргалки = контраст «Ошибка ученика» → «Как правильно». Первый example ≈ эта пара (или очень близко).',
    '- Не уводи в соседнюю грамматику (если якорь over/on — не делай урок про in/at, если их нет в якоре/reasons).',
    '- Не редкие exceptions, не «всегда/никогда», не академические ярлыки, не выдуманные формы.',
    '- Только A1–A2 high-frequency. Не уверен — меньше пунктов, не больше «умных» правил.',
    '- Если в теме A / B — kind=contrast; оба якоря в how/examples/mistakes; contrastPair обязателен.',
    '- Не противоречь «Почему (из подсказки)».',
    '- Текст секций на русском; EN только в примерах и шаблонах.',
    '- intro.quick короткий, без инфошума.',
    '',
    ETALON_DENSITY_FEW_SHOT,
  ].join('\n')
}

export function buildReviewChipLessonUserPayload(params: {
  chip: LanguageNoteReviewTopic
  note: LanguageNote
}): string {
  const { topic, gloss } = parseReviewTopicTitle(params.chip.title)
  const reasons = params.note.correctReasons.slice(0, 2).filter(Boolean)
  return [
    `Тема (EN-anchor): ${topic || params.chip.title}`,
    gloss ? `Gloss: ${gloss}` : '',
    `Ошибка ученика: ${params.note.original}`,
    `Как правильно: ${params.note.correct}`,
    reasons.length ? `Почему (из подсказки):\n${reasons.map((r, i) => `${i + 1}) ${r}`).join('\n')}` : '',
    'Собери шпаргалку, которая объясняет именно этот контраст под данным EN-anchor.',
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
