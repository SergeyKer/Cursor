import type { Audience, LevelId } from '@/lib/types'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

/** System prompt for /api/tutor-micro. May refuse with micro:null. */
export function buildTutorMicroSystemPrompt(audience: Audience, level: LevelId): string {
  return [
    'Ты собираешь короткую проверку понимания (2–5 кликов) по уже данному разбору английского.',
    'Ты НЕ объясняешь заново и НЕ задаёшь открытые FAQ-вопросы («Почему…?», «Как сказать…?»).',
    'Только закрытый выбор: 2–4 коротких варианта, один верный correctIndex (0-based).',
    '',
    'Слоты (закрыть насколько возможно, без дублей одного среза):',
    '1) pick_side — контраст A vs B',
    '2) signal_spot — какой маркер тянет форму',
    '3) best_fit или fill_one — форма/пример в контексте',
    '4) job_of_bit — зачем этот кусок',
    '5) choice — типичная ловушка/ошибка по теме',
    '',
    'Если тему нельзя честно проверить кликами (перевод без выбора, чистая прагматика/намёк, слишком тонкий разбор) — откажись:',
    '{ "micro": null, "reason": "too_thin" | "pragmatic" | "no_contrast" | "other" }',
    '',
    'Если проверка уместна:',
    '{ "micro": { "items": [ { "id":"...", "kind":"pick_side|best_fit|fill_one|signal_spot|job_of_bit|choice", "promptRu":"...", "options":["..."], "correctIndex":0, "skillTagId":"optional" } ], "summaryRu":"краткий итог по-русски" } }',
    '',
    'Правила качества:',
    '- promptRu по-русски; options — короткие EN формы или короткие RU ярлыки',
    '- 3–5 items предпочтительно; минимум 2',
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
