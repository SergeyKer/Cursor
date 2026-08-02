import type { Audience, LevelId } from '@/lib/types'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

const FEW_SHOT_MISTAKE = [
  'Пример (mistake «I very like pizza»):',
  '{ "micro": { "items": [',
  '  { "id":"c1", "kind":"choice", "promptRu":"Какая фраза правильная?", "options":["I very like pizza","I really like pizza"], "correctIndex":1 },',
  '  { "id":"c2", "kind":"signal_spot", "promptRu":"Какое слово усиливает like?", "options":["very","really"], "correctIndex":1 },',
  '  { "id":"c3", "kind":"job_of_bit", "promptRu":"Зачем really перед like?", "options":["Усиливает чувство","Меняет время"], "correctIndex":0 }',
  '], "summaryRu":"С like — really, не very." } }',
].join('\n')

/** System prompt for /api/tutor-micro. May refuse with micro:null. */
export function buildTutorMicroSystemPrompt(audience: Audience, level: LevelId): string {
  return [
    'Ты собираешь короткую проверку понимания (2–5 кликов) по уже данному разбору английского.',
    'Ты НЕ объясняешь заново и НЕ задаёшь открытые FAQ-вопросы («Почему…?», «Как сказать…?»).',
    'Только закрытый выбор: 2–4 коротких варианта, один верный correctIndex (0-based).',
    '',
    'Слоты (стремись закрыть 3–5 разных; без дублей одного среза):',
    '1) pick_side — контраст A vs B',
    '2) signal_spot — какой маркер тянет форму',
    '3) best_fit или form_one — форма/пример в контексте',
    '4) job_of_bit — зачем этот кусок',
    '5) choice — типичная ловушка/ошибка по теме',
    '',
    'Mistakes / «нельзя…» / цитата ошибки в вопросе ученика:',
    '- Минимум один choice: wrong = ошибочная фраза из вопроса (как есть), correct = верный вариант из examplesEn или разбора.',
    '- Не выдумывай чужую тему; дистракторы из той же ловушки.',
    '',
    'Объём: цель 3–5 items с разными kind; ровно 2 — только если иначе нельзя честно проверить.',
    '',
    'Если тему нельзя честно проверить кликами (перевод без выбора, чистая прагматика/намёк, слишком тонкий разбор) — откажись:',
    '{ "micro": null, "reason": "too_thin" | "pragmatic" | "no_contrast" | "other" }',
    '',
    'Если проверка уместна:',
    '{ "micro": { "items": [ { "id":"...", "kind":"pick_side|best_fit|form_one|signal_spot|job_of_bit|choice", "promptRu":"...", "options":["..."], "correctIndex":0, "skillTagId":"optional" } ], "summaryRu":"краткий итог по-русски" } }',
    '',
    FEW_SHOT_MISTAKE,
    '',
    'Правила качества:',
    '- promptRu по-русски; options — короткие EN формы или короткие RU ярлыки',
    '- минимум 2 items; предпочтительно 3–5',
    '- correctIndex обязан указывать реально верный вариант',
    '- дистрактор из той же темы, не случайная правка времени',
    '- запрещены: «Тема сейчас…?», «Верно ли это правило?» без содержания, открытые «Почему/Как сказать»',
    '- опирайся только на данный Explain + вопрос ученика',
    '',
    audience === 'child'
      ? 'Аудитория: ребёнок/подросток. Простые формулировки на «ты», без сюра и без академического жаргона.'
      : 'Аудитория: взрослый. Спокойный тон, без сюра и без воды.',
    `Уровень CEFR-якорь: ${level}.`,
    'Верни ТОЛЬКО JSON без markdown.',
  ].join('\n')
}

export function buildTutorMicroUserPrompt(params: {
  userQuestion: string
  answer: TutorExplainAnswer
}): string {
  const { userQuestion, answer } = params
  return [
    `Вопрос ученика: ${userQuestion}`,
    `answerKind: ${answer.answerKind}`,
    `title: ${answer.title}`,
    `topicAnchor: ${JSON.stringify(answer.topicAnchor)}`,
    answer.contrastPair ? `contrastPair: ${JSON.stringify(answer.contrastPair)}` : '',
    answer.rememberRu ? `rememberRu: ${answer.rememberRu}` : '',
    `examplesEn: ${JSON.stringify(answer.examplesEn)}`,
    `paragraphs: ${JSON.stringify(answer.paragraphs)}`,
  ]
    .filter(Boolean)
    .join('\n')
}
