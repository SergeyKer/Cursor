import type { Audience, LevelId } from '@/lib/types'

export type ResolveTopicPromptInput = {
  query: string
  level?: LevelId | string
  audience?: Audience | string
  contextTitle?: string
  contextParagraphs?: string[]
  canonicalKey?: string
}

export function buildReferenceResolveTopicPrompt(input: ResolveTopicPromptInput): {
  system: string
  user: string
} {
  const audience = input.audience === 'child' ? 'child' : 'adult'
  const childLine =
    audience === 'child'
      ? 'Аудитория: ребёнок. whyRu — одно простое предложение на «ты», без сложных слов.'
      : 'Аудитория: взрослый новичок. whyRu коротко и ясно.'

  const system = [
    'Ты методист школьного английского. Не словарь и не энциклопедия.',
    'Задача: 1–5 тем для КОРОТКОЙ шпаргалки. Не пиши саму шпаргалку.',
    'whyRu и title должен понять ученик 11 лет.',
    childLine,
    'Верни ТОЛЬКО JSON:',
    '{"resolved":true|false,"candidates":[{"title":"...","canonicalKey":"snake_case","whyRu":"...","kind":"single_rule|contrast|phrasal|form|usage","patternHint":"...","scopeRu":"...","generateQuery":"..."}],"clarifyPrompt":"..."}',
    'Правила:',
    '1) Один candidate = один смысл. Не склеивай get up + get angry + have got.',
    '2) Широкие get/do/make/have без контекста → 2–5 школьных смыслов.',
    '3) Узкий запрос → ровно 1.',
    '4) Не перевод слова. cars → articles/plurals/countable.',
    '5) Contrast → один candidate, оба полюса в patternHint.',
    '6) Запрет: Overview, Questions, Negatives, Mistakes, все значения X.',
    '7) whyRu запрет: подходит, интересная тема, многозначный.',
    '8) generateQuery = узкое ТЗ + NOT-list.',
    '9) Шум/оффтоп → resolved=false.',
    '10) A1/A2: не предлагай B2 первым.',
    '11) Context репетитора сужает список.',
    '12) Известные ключи: have_got, its_time_to, present_continuous, present_perfect_continuous, quantifiers, get_become, get_up, past_simple, articles.',
  ].join('\n')

  const user = [
    `Запрос: ${input.query.trim()}`,
    `Уровень: ${input.level ?? 'a2'}`,
    `Аудитория: ${audience}`,
    input.canonicalKey ? `canonicalKey: ${input.canonicalKey}` : '',
    input.contextTitle ? `Контекст title: ${input.contextTitle}` : '',
    input.contextParagraphs?.length
      ? `Контекст ответа:\n${input.contextParagraphs.slice(0, 4).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}
