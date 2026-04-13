import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import type { AiProvider } from '@/lib/types'
import { hasRequiredTheoryStructure, isValidLessonBlueprint } from '@/lib/lessonBlueprint'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  topic?: string
  level?: string
  audience?: string
  analysisSummary?: string
}

function normalizeTheoryIntro(raw: string): string {
  const markers = ['**Урок:**', '**Правило:**', '**Примеры:**', '**Коротко:**', '**Шаблоны:**']
  let text = raw.replace(/\r\n/g, '\n').trim()
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`\\s*${escaped}\\s*`, 'g'), `\n${marker} `)
  }
  // Убираем лишний пробел после заголовка перед переносом, если заголовок отдельной строкой.
  text = text.replace(/\n(\*\*[^\n]+:\*\*)\s*\n/g, '\n$1\n')
  return text.trim()
}

function defaultLesson(topic: string) {
  const safeTopic = topic.trim() || 'выбранной теме'
  return {
    title: `Тема: ${safeTopic}`,
    theoryIntro:
      `**Урок:** ${safeTopic}\n` +
      '**Правило:**\n' +
      '1) Берем ключевую тему и применяем в коротких фразах.\n' +
      '2) Используем тему в понятном контексте.\n' +
      '**Примеры:**\n' +
      `1) We practice ${safeTopic} in simple phrases.\n` +
      `2) This sentence is about ${safeTopic}.\n` +
      '**Коротко:** это правило нужно, чтобы уверенно использовать тему в речи.\n' +
      '**Шаблоны:**\n' +
      `1) I use ${safeTopic} in context.\n` +
      `2) This is about ${safeTopic}.`,
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples: `**Примеры по теме "${safeTopic}":**\n1) First short example.\n2) Second short example.\n3) Third short example.`,
      fill_phrase: '**Подставь слово:**\n1) I ____ this topic.\n2) This is ____ example.\nВыбери подходящее слово.',
      repeat_translate: '**Переведи на английский:**\n1) Это моя тема.\n2) Я хочу изучать это.\n3) Дай короткий пример.',
      write_own_sentence: `**Напиши своё предложение:**\nТема: ${safeTopic}\nНапиши 3 коротких примера.`,
    },
  }
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const topic = (body.topic ?? '').trim()
  if (!topic) {
    return NextResponse.json({ error: 'Тема для урока не передана.' }, { status: 400 })
  }

  const system = [
    'Ты методист английского для MyEng.',
    'Верни ТОЛЬКО JSON lesson blueprint для короткого урока.',
    'theoryIntro ОБЯЗАТЕЛЬНО строго в таком порядке и с жирными заголовками:',
    '**Урок:**',
    '**Правило:**',
    '**Примеры:**',
    '**Коротко:**',
    '**Шаблоны:**',
    'Формат:',
    '{',
    '  "title":"строка",',
    '  "theoryIntro":"строка с \\n",',
    '  "actions":[{"id":"examples","label":"Посмотри примеры"},{"id":"fill_phrase","label":"Подставь слово"},{"id":"repeat_translate","label":"Переведи на английский"},{"id":"write_own_sentence","label":"Напиши своё предложение"}],',
    '  "followups":{"examples":"строка","fill_phrase":"строка","repeat_translate":"строка","write_own_sentence":"строка"}',
    '}',
    'Текст секций на русском, английские примеры допустимы.',
    'Не пропускай секции и не меняй порядок заголовков.',
  ].join('\n')

  const user = [
    `Тема: ${topic}`,
    `Уровень: ${body.level ?? 'a2'}`,
    `Аудитория: ${body.audience ?? 'adult'}`,
    body.analysisSummary ? `Контекст с фото: ${body.analysisSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const model = await callProviderChat({
    provider,
    req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens: 1000,
    openAiChatPreset,
  })

  if (!model.ok) {
    return NextResponse.json({ lesson: defaultLesson(topic), generated: false, fallback: true })
  }

  const json = extractJsonObject(model.content)
  if (!json) return NextResponse.json({ lesson: defaultLesson(topic), generated: false, fallback: true })

  try {
    const parsed = JSON.parse(json) as unknown
    if (!isValidLessonBlueprint(parsed)) {
      return NextResponse.json({ lesson: defaultLesson(topic), generated: false, fallback: true })
    }
    const normalizedTheoryIntro = normalizeTheoryIntro(parsed.theoryIntro)
    if (!hasRequiredTheoryStructure(normalizedTheoryIntro)) {
      return NextResponse.json({ lesson: defaultLesson(topic), generated: false, fallback: true })
    }
    return NextResponse.json({
      lesson: { ...parsed, theoryIntro: normalizedTheoryIntro },
      generated: true,
      fallback: false,
    })
  } catch {
    return NextResponse.json({ lesson: defaultLesson(topic), generated: false, fallback: true })
  }
}
