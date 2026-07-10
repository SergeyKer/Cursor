import { NextRequest, NextResponse } from 'next/server'
import { buildProxyFetchExtra } from '@/lib/proxyFetch'
import { truncateForSttPunctuate } from '@/lib/voice/sttPunctuation'

export const runtime = 'nodejs'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = [
  'You add punctuation and capitalization to speech-to-text transcripts.',
  'Rules:',
  '- Change ONLY punctuation and letter case.',
  '- Do NOT add, remove, replace, or reorder any words.',
  '- Do NOT fix grammar, spelling, or word choice (keep learner mistakes).',
  '- Use ? only when interrogative syntax is clear (who/what/how/where/when/why, do/does/did/are/is/am inversion, Russian кто/что/как/где/когда/почему).',
  '- Otherwise use . for statements.',
  '- Prefer ! after greetings: hello, hi, привет.',
  '- Support English and Russian.',
  '- Return plain text only. No quotes, no markdown, no explanation.',
].join('\n')

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: unknown }
    const text = truncateForSttPunctuate(typeof body.text === 'string' ? body.text : '')
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) {
      return NextResponse.json({ error: 'STT punctuate is not configured' }, { status: 500 })
    }

    const proxyFetchExtra = await buildProxyFetchExtra()
    const upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
      ...(proxyFetchExtra as RequestInit),
    } as RequestInit)

    if (!upstream.ok) {
      const errText = await upstream.text()
      return NextResponse.json(
        { error: 'Punctuation failed', details: errText },
        { status: upstream.status }
      )
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
    }
    const first = data.choices?.[0]
    const raw = (first?.message?.content ?? first?.text ?? '').trim()
    const cleaned = raw.replace(/^["'«»]+|["'«»]+$/g, '').trim()
    if (!cleaned) {
      return NextResponse.json({ error: 'Empty punctuation result' }, { status: 502 })
    }

    return NextResponse.json({ text: cleaned })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Punctuation failed' },
      { status: 500 }
    )
  }
}
