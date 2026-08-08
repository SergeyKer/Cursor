import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { featureFlags } from '@/lib/featureFlags'
import { gateReferenceSheetIntro } from '@/lib/reference/sheetOutputGate'
import { buildReferenceSheetPrompt } from '@/lib/reference/sheetPrompt'
import { isShortReferenceQuery } from '@/lib/reference/resolveReferenceTarget'
import type { AiProvider } from '@/lib/types'
import type { LessonIntro } from '@/types/lesson'
import { matchTutorGate } from '@/lib/tutor/tutorGate'

export const maxDuration = 60

type Body = {
  query?: string
  generateQuery?: string
  selectedTitle?: string
  excludeScopes?: string[]
  patternHint?: string
  level?: string
  audience?: string
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  groundedExplain?: {
    answerKind: string
    title: string
    paragraphs: string[]
    examplesEn: string[]
    rememberRu?: string
    contrastPair?: [string, string]
    topicAnchor: { title: string; canonicalKey: string; lessonIdHint?: string | null }
  }
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  return start >= 0 && end > start ? raw.slice(start, end + 1) : ''
}

export async function POST(req: NextRequest) {
  if (!featureFlags.referenceGenerate) {
    return NextResponse.json({ error: 'Генерация справочника отключена.' }, { status: 404 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const generateQuery = (body.generateQuery || body.query || '').trim()
  const query = (body.query || generateQuery).trim()

  if (body.groundedExplain) {
    const { buildGroundedReferenceSheetPrompt } = await import('@/lib/reference/sheetPrompt')
    const prompt = buildGroundedReferenceSheetPrompt({
      explain: {
        ...body.groundedExplain,
        cheatsheetVisibility: 'primary',
        topicAnchor: {
          title: body.groundedExplain.topicAnchor.title,
          canonicalKey: body.groundedExplain.topicAnchor.canonicalKey,
          lessonIdHint: body.groundedExplain.topicAnchor.lessonIdHint,
        },
      } as import('@/lib/tutor/types').TutorExplainAnswer,
      level: body.level,
      audience: body.audience,
      generateQuery,
    })
    const model = await callProviderChat({
      provider: body.provider === 'openrouter' ? 'openrouter' : 'openai',
      req,
      apiMessages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      maxTokens: 1200,
      openAiChatPreset: body.openAiChatPreset ?? 'gpt-4o-mini',
      traceLabel: 'reference-sheet-grounded',
    })
    if (!model.ok) return NextResponse.json({ error: 'Не удалось собрать шпаргалку.' }, { status: 502 })
    let intro: LessonIntro
    try {
      intro = JSON.parse(extractJsonObject(model.content)) as LessonIntro
    } catch {
      return NextResponse.json({ error: 'Не удалось собрать шпаргалку.' }, { status: 502 })
    }
    const gate = gateReferenceSheetIntro({
      ok: true,
      intro,
      lessonTitle: intro.topic,
      enAnchor: body.groundedExplain.title || generateQuery,
    })
    if (gate.reject) {
      return NextResponse.json({ error: 'Не удалось собрать шпаргалку.', reason: gate.reason }, { status: 422 })
    }
    return NextResponse.json({ intro: gate.intro })
  }

  // Chosen generateQuery may be long; only short-check raw query when no generateQuery override.
  if (!generateQuery) {
    return NextResponse.json({ error: 'Уточни тему подробнее.' }, { status: 422 })
  }
  if (!body.generateQuery && isShortReferenceQuery(query)) {
    return NextResponse.json({ error: 'Уточни тему подробнее.' }, { status: 422 })
  }
  if (matchTutorGate(query) || matchTutorGate(generateQuery)) {
    return NextResponse.json({ error: 'Эта тема не подходит для справочника.' }, { status: 422 })
  }

  const prompt = buildReferenceSheetPrompt({
    query,
    generateQuery,
    selectedTitle: body.selectedTitle,
    excludeScopes: body.excludeScopes,
    patternHint: body.patternHint,
    level: body.level,
    audience: body.audience,
  })
  const model = await callProviderChat({
    provider: body.provider === 'openrouter' ? 'openrouter' : 'openai',
    req,
    apiMessages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    maxTokens: 1200,
    openAiChatPreset: body.openAiChatPreset ?? 'gpt-4o-mini',
    traceLabel: 'reference-sheet',
  })
  if (!model.ok) return NextResponse.json({ error: 'Не удалось собрать шпаргалку.' }, { status: 502 })

  let intro: LessonIntro
  try {
    intro = JSON.parse(extractJsonObject(model.content)) as LessonIntro
  } catch {
    return NextResponse.json({ error: 'Не удалось собрать шпаргалку.' }, { status: 502 })
  }

  const gate = gateReferenceSheetIntro({
    ok: true,
    intro,
    lessonTitle: intro.topic,
    enAnchor: generateQuery,
  })
  if (gate.reject) {
    return NextResponse.json({ error: 'Не удалось собрать шпаргалку.', reason: gate.reason }, { status: 422 })
  }

  return NextResponse.json({ intro: gate.intro })
}
