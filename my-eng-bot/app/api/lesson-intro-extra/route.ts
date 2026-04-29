import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { isValidLessonIntro } from '@/lib/lessonIntro'
import { extractJsonObject } from '@/lib/structuredLessonFactory'
import type { AiProvider, Audience, OpenAiChatPreset } from '@/lib/types'
import type { Bubble, LessonIntro } from '@/types/lesson'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  intro?: unknown
  iteration?: number
  previousBlocks?: string[]
}

type GeneratedDeepDive = {
  commonMistakes?: unknown
  contrastNotes?: unknown
  selfCheckRule?: unknown
}

function normalizeStringList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

function normalizeGeneratedDeepDive(value: GeneratedDeepDive): {
  commonMistakes: string[]
  contrastNotes: string[]
  selfCheckRule: string
} | null {
  const commonMistakes = normalizeStringList(value.commonMistakes, 3)
  const contrastNotes = normalizeStringList(value.contrastNotes, 3)
  const selfCheckRule = typeof value.selfCheckRule === 'string' ? value.selfCheckRule.trim() : ''

  if (commonMistakes.length === 0 || contrastNotes.length === 0 || !selfCheckRule) return null
  return { commonMistakes, contrastNotes, selfCheckRule }
}

function formatList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

function buildBubbles(deepDive: { commonMistakes: string[]; contrastNotes: string[]; selfCheckRule: string }): [Bubble, Bubble, Bubble] {
  return [
    {
      type: 'positive',
      content: `🔬 ЧАСТЫЕ ОШИБКИ\n${formatList(deepDive.commonMistakes)}`,
    },
    {
      type: 'info',
      content: `⚪ НЮАНСЫ\n${formatList(deepDive.contrastNotes)}`,
    },
    {
      type: 'task',
      content: `🟢 САМОПРОВЕРКА\n${deepDive.selfCheckRule}`,
    },
  ]
}

function buildPrompt(intro: LessonIntro, audience: Audience, iteration: number, previousBlocks: string[]): string {
  return JSON.stringify(
    {
      task: 'Generate one fresh extra deep-dive block for a short English lesson intro.',
      outputLanguage: 'ru',
      audience,
      iteration,
      topic: intro.topic,
      kind: intro.kind,
      complexity: intro.complexity,
      knownIntro: {
        quick: intro.quick,
        details: intro.details ?? null,
        baseDeepDive: intro.deepDive ?? null,
        learningPlan: intro.learningPlan ?? null,
      },
      previousGeneratedBlocks: previousBlocks.slice(-6),
      requiredJsonShape: {
        commonMistakes: ['2-3 новые частые ошибки, не повторять уже показанные'],
        contrastNotes: ['2-3 новых нюанса или контраста, коротко и практично'],
        selfCheckRule: 'одна новая проверка перед ответом',
      },
    },
    null,
    2
  )
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  if (!isValidLessonIntro(body.intro)) {
    return NextResponse.json({ error: 'Некорректное intro урока.' }, { status: 400 })
  }

  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
  const iteration = Number.isFinite(body.iteration) ? Math.max(1, Math.floor(Number(body.iteration))) : 1
  const previousBlocks = Array.isArray(body.previousBlocks)
    ? body.previousBlocks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  const system = [
    'Ты методист английского для MyEng.',
    'Нужно бесконечно продолжать deep-dive для короткого урока: каждый ответ новый, не повторяет уже показанное.',
    'Верни только JSON без markdown.',
    'Формат строго: {"commonMistakes":["..."],"contrastNotes":["..."],"selfCheckRule":"..."}',
    'commonMistakes: 2-3 практичные ошибки ученика, можно с English examples.',
    'contrastNotes: 2-3 коротких нюанса или контраста, которые цепляют глаз и помогают не ошибиться.',
    'selfCheckRule: одна короткая проверка перед ответом.',
    'Пиши по-русски, английский оставляй только в примерах и шаблонах.',
    'Не повторяй формулировки из baseDeepDive и previousGeneratedBlocks.',
  ].join('\n')

  const model = await callProviderChat({
    provider,
    req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: buildPrompt(body.intro, audience, iteration, previousBlocks) },
    ],
    maxTokens: 850,
    openAiChatPreset,
    traceLabel: 'lesson-intro-extra',
  })

  if (!model.ok) {
    return NextResponse.json({ error: 'Не удалось сгенерировать продолжение.' }, { status: 502 })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(model.content)) as GeneratedDeepDive
    const deepDive = normalizeGeneratedDeepDive(parsed)
    if (!deepDive) {
      return NextResponse.json({ error: 'Модель вернула неполный deep-dive.' }, { status: 502 })
    }
    return NextResponse.json({ bubbles: buildBubbles(deepDive), generated: true })
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать JSON deep-dive.' }, { status: 502 })
  }
}
