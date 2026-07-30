import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { callProviderChat } from '@/lib/callProviderChat'
import { normalizeTutorExplainResult } from '@/lib/tutor/normalizeExplain'
import { compactText } from '@/lib/tutor/text'
import type { TutorTopicContext } from '@/lib/tutor/types'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 30
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  query?: string
  level?: LevelId
  audience?: Audience
  topicContext?: TutorTopicContext | null
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function formatTopicContext(ctx: TutorTopicContext | null | undefined): string {
  if (!ctx?.anchor?.title) return ''
  const lines = [
    `Активная тема: ${ctx.anchor.title} (${ctx.anchor.canonicalKey || 'topic'})`,
    ctx.anchor.rememberRu ? `Уже запомнили: ${ctx.anchor.rememberRu}` : '',
  ]
  if (Array.isArray(ctx.recentTurns) && ctx.recentTurns.length > 0) {
    lines.push('Недавний контекст:')
    for (const turn of ctx.recentTurns.slice(-2)) {
      const role = turn.role === 'user' ? 'Ученик' : 'Репетитор'
      const text = compactText(turn.text, 280)
      if (text) lines.push(`- ${role}: ${text}`)
    }
  }
  return lines.filter(Boolean).join('\n')
}

function buildSystemPrompt(
  audience: Audience,
  level: LevelId,
  hasTopicContext: boolean
): string {
  const childRules =
    audience === 'child'
      ? [
          'Аудитория: ребёнок/подросток. Пиши просто, по-русски, на «ты».',
          'Безопасность: только школьный английский; без взрослых/опасных тем.',
          'Если in_scope: paragraphs ровно 2..5 коротких абзацев; examplesEn 1..2.',
        ]
      : [
          'Аудитория: взрослый. Объяснения по-русски; можно чуть компактнее.',
          'Если in_scope: paragraphs 1..5; examplesEn 0..3.',
        ]

  const answerRecipe = [
    'Как отвечать (in_scope):',
    '- Сначала прямой ответ на вопрос ученика (первая фраза/абзац).',
    '- Дальше только нужное: смысл / когда так / чем не путать — по CEFR, без лекции.',
    '- examplesEn — короткие живые фразы на английском; для grammar|contrast|form|orthography|how_to_say — хотя бы 1 пример.',
    '- rememberRu — одна фраза-запоминалка ПО-РУССКИ (кириллица). EN-формы можно как токены (have / have got), но не пиши всю запоминалку по-английски и без обёрток Remember:/Note:/Tip:.',
    '- title, paragraphs, rememberRu, messageRu — на русском; английский только в examplesEn и как короткие цитаты/формы внутри RU-текста.',
    '- Без воды: без «давай разберём», планов занятия, повторов, общих мотивирующих абзацев.',
    '- Не выдумывай редкие факты; опирайся на стандартное правило и обычное использование; не уверен — скажи проще и безопасный вариант.',
    '- Длина: лучше 2–3 коротких абзаца, чем 5 размытых; не растягивай до max зря.',
    '- Не пиши эссе/письмо/список на 50 слов/ролеплей целиком — предложи узкий EN-шаг.',
    '- EN-фразу разбирай как язык; не отвечай от лица чат-бота («Yes, I do»).',
  ]

  const contextRules = hasTopicContext
    ? [
        'Есть активная тема (topicContext):',
        '- Уточнения вроде «а в отрицании?», «а пример», «почему?» — углуби якорь, не переводи как новую how_to_say фразу.',
        '- «проверь: …» / is this correct — разбор формы/ошибки, не квиз.',
        '- Не повторяй весь прошлый ответ с нуля.',
        '- Если явно новая EN-тема — смени topicAnchor.',
      ]
    : [
        'Нет активной темы (первый ответ / смена темы):',
        '- RU-фраза без маркера → по умолчанию how_to_say / translate на EN.',
        '- «составь предложение со словами…» → EN-предложение + кратко почему так.',
        '- «научи английскому» → один конкретный следующий шаг, не курс.',
        '- Явный квиз/«закрепи» → короткий якорь темы + скажи, что проверка — кнопкой «Закрепить 2 мин» (не генерируй полный квиз).',
      ]

  return [
    'Ты — репетитор английского.',
    'Это НЕ урок и НЕ эссе: без Hook/Rule/Formula карточек, без длинного плана занятия.',
    'Язык для ученика: русский. Английский — только в examplesEn и как короткие формы/цитаты внутри русского текста.',
    'Верни ТОЛЬКО JSON без markdown.',
    '',
    'Сначала scope:',
    '- in_scope — запрос помогает понять / сказать / написать / перевести / проверить английский',
    '  (правило, contrast, форма, перевод, how_to_say, орфография, разбор ошибки/домашки EN, значение слова).',
    '- out_of_scope — не про английский, другой предмет целиком, болтовня, огромный заказ работы, опасное.',
    'Серое: «переведи условие физики» → in_scope как translate (только язык, предмет не решай).',
    '',
    'Если out_of_scope:',
    '{ "scope": "out_of_scope", "messageRu": "короткий вежливый отказ по-русски + что можно спросить" }',
    '',
    'Если in_scope:',
    '{',
    '  "scope": "in_scope",',
    '  "answerKind": "grammar|contrast|form|translate|how_to_say|orthography|other",',
    '  "title": "короткий заголовок на русском",',
    '  "paragraphs": ["абзац на русском", "..."],',
    '  "examplesEn": ["English example"],',
    '  "rememberRu": "одна фраза-запоминалка по-русски",',
    '  "contrastPair": ["A","B"],',
    '  "topicAnchor": { "title":"...", "canonicalKey":"snake_case", "lessonIdHint": null, "skillTagIds": [] }',
    '}',
    ...answerRecipe,
    ...contextRules,
    `Уровень CEFR-якорь: ${level}.`,
    ...childRules,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req.headers)
  if (!checkIpRateLimit({ buckets: rateBuckets, ip, windowMs: RATE_WINDOW_MS, max: RATE_MAX })) {
    return NextResponse.json(
      { error: 'rate_limit', userMessage: 'Слишком много запросов. Подождите.' },
      { status: 429 }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'bad_json', userMessage: 'Неверный JSON.' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.replace(/\s+/g, ' ').trim() : ''
  if (!query) {
    return NextResponse.json(
      { error: 'empty_query', userMessage: 'Пустой вопрос.' },
      { status: 400 }
    )
  }

  const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
  const level: LevelId = body.level ?? 'a2'
  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'

  const topicContext =
    body.topicContext && typeof body.topicContext === 'object' ? body.topicContext : null
  const hasTopicContext = Boolean(topicContext?.anchor?.title)

  const system = buildSystemPrompt(audience, level, hasTopicContext)
  const user = [`Вопрос ученика: ${query}`, formatTopicContext(topicContext)].filter(Boolean).join('\n\n')

  try {
    const model = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens: 900,
      openAiChatPreset,
      traceLabel: 'tutor-explain',
    })

    if (!model.ok) {
      return NextResponse.json(
        { error: 'provider_failed', userMessage: 'Не удалось объяснить. Попробуй ещё раз.' },
        { status: 502 }
      )
    }

    let parsed: unknown = null
    try {
      parsed = JSON.parse(extractJsonObject(model.content) || model.content)
    } catch {
      parsed = null
    }

    const result = normalizeTutorExplainResult(parsed, { audience })
    if (!result) {
      return NextResponse.json(
        { error: 'normalize_failed', userMessage: 'Не удалось разобрать ответ. Попробуй ещё раз.' },
        { status: 502 }
      )
    }

    if (result.scope === 'out_of_scope') {
      return NextResponse.json({
        scope: 'out_of_scope',
        messageRu: result.messageRu,
      })
    }

    return NextResponse.json({ scope: 'in_scope', answer: result.answer })
  } catch {
    return NextResponse.json(
      { error: 'provider_failed', userMessage: 'Не удалось объяснить. Попробуй ещё раз.' },
      { status: 502 }
    )
  }
}
