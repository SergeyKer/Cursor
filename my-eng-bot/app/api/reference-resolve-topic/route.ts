import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { featureFlags } from '@/lib/featureFlags'
import { getPrebuiltSheet } from '@/lib/reference/prebuiltStore'
import { buildReferenceResolveTopicPrompt } from '@/lib/reference/resolveTopicPrompt'
import { matchTutorGate } from '@/lib/tutor/tutorGate'
import { isTutorNoise } from '@/lib/tutor/tutorIntent'
import type { AiProvider } from '@/lib/types'

export const maxDuration = 30

type Body = {
  query?: string
  level?: string
  audience?: string
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  contextTitle?: string
  contextParagraphs?: string[]
  canonicalKey?: string
}

type CandidateOut = {
  title: string
  canonicalKey: string
  whyRu: string
  kind: string
  patternHint: string
  scopeRu: string
  generateQuery: string
  openKind: 'prebuilt' | 'generate'
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  return start >= 0 && end > start ? raw.slice(start, end + 1) : ''
}

export async function POST(req: NextRequest) {
  if (!featureFlags.referenceGenerate) {
    return NextResponse.json({ error: 'Резолв тем отключён.' }, { status: 404 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const query = (body.query ?? '').trim()
  if (!query || isTutorNoise(query)) {
    return NextResponse.json({
      resolved: false,
      candidates: [],
      clarifyPrompt: 'Не похоже на тему. Напиши правило или конструкцию.',
    })
  }
  if (matchTutorGate(query)) {
    return NextResponse.json({
      resolved: false,
      candidates: [],
      clarifyPrompt: 'Спроси правило или «как сказать…».',
    })
  }

  const prompt = buildReferenceResolveTopicPrompt({
    query,
    level: body.level,
    audience: body.audience,
    contextTitle: body.contextTitle,
    contextParagraphs: body.contextParagraphs,
    canonicalKey: body.canonicalKey,
  })

  const model = await callProviderChat({
    provider: body.provider === 'openrouter' ? 'openrouter' : 'openai',
    req,
    apiMessages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    maxTokens: 700,
    openAiChatPreset: body.openAiChatPreset ?? 'gpt-4o-mini',
    traceLabel: 'reference-resolve-topic',
  })

  if (!model.ok) {
    return NextResponse.json({
      resolved: false,
      candidates: [],
      clarifyPrompt: 'Не удалось разобрать тему. Уточни запрос.',
    })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(model.content)) as {
      resolved?: boolean
      candidates?: Array<Record<string, unknown>>
      clarifyPrompt?: string
    }
    if (!parsed.resolved || !Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
      return NextResponse.json({
        resolved: false,
        candidates: [],
        clarifyPrompt:
          typeof parsed.clarifyPrompt === 'string'
            ? parsed.clarifyPrompt
            : 'Уточни тему для справочника.',
      })
    }

    const candidates: CandidateOut[] = []
    for (const row of parsed.candidates) {
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      const canonicalKey = typeof row.canonicalKey === 'string' ? row.canonicalKey.trim() : ''
      const whyRu = typeof row.whyRu === 'string' ? row.whyRu.trim() : ''
      const generateQuery =
        typeof row.generateQuery === 'string' ? row.generateQuery.trim() : title
      if (!title || !whyRu) continue
      const prebuilt = canonicalKey ? getPrebuiltSheet(canonicalKey) : null
      candidates.push({
        title: prebuilt?.title || title,
        canonicalKey: canonicalKey || title.toLowerCase().replace(/\s+/g, '_'),
        whyRu,
        kind: typeof row.kind === 'string' ? row.kind : 'single_rule',
        patternHint: typeof row.patternHint === 'string' ? row.patternHint : '',
        scopeRu: typeof row.scopeRu === 'string' ? row.scopeRu : '',
        generateQuery: generateQuery || title,
        openKind: prebuilt ? 'prebuilt' : 'generate',
      })
      if (candidates.length >= 5) break
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        resolved: false,
        candidates: [],
        clarifyPrompt: 'Уточни тему для справочника.',
      })
    }

    return NextResponse.json({ resolved: true, candidates })
  } catch {
    return NextResponse.json({
      resolved: false,
      candidates: [],
      clarifyPrompt: 'Не удалось разобрать тему. Уточни запрос.',
    })
  }
}
