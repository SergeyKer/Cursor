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
  level?: string
  audience?: string
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
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

  const query = (body.query ?? '').trim()
  if (!query || isShortReferenceQuery(query)) {
    return NextResponse.json({ error: 'Уточни тему подробнее.' }, { status: 422 })
  }
  if (matchTutorGate(query)) {
    return NextResponse.json({ error: 'Эта тема не подходит для справочника.' }, { status: 422 })
  }

  const prompt = buildReferenceSheetPrompt({
    query,
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
    enAnchor: query,
  })
  if (gate.reject) {
    return NextResponse.json({ error: 'Не удалось собрать шпаргалку.', reason: gate.reason }, { status: 422 })
  }
  return NextResponse.json({ intro: gate.intro })
}
