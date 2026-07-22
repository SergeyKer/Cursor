import { NextRequest, NextResponse } from 'next/server'
import { buildProxyFetchExtra } from '@/lib/proxyFetch'
import { buildProviderUserMessage } from '@/lib/buildProviderUserMessage'
import {
  buildLanguageNoteSystemPrompt,
  buildLanguageNoteUserPayload,
  resolveLanguageNoteCorrectTarget,
} from '@/lib/languageNote/prompt'
import { parseLanguageNoteResponse } from '@/lib/languageNote/parseLanguageNoteResponse'
import { applyTeacherEtalonLock } from '@/lib/languageNote/applyTeacherEtalonLock'
import { truncateLanguageNoteInput } from '@/lib/languageNote/eligibility'
import type { Audience, CommunicationVoiceInputMode } from '@/lib/types'
import type { LanguageNoteMode } from '@/lib/languageNote/types'

export const runtime = 'nodejs'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

type Provider = 'openrouter' | 'openai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = truncateLanguageNoteInput(typeof body.text === 'string' ? body.text : '')
    const provider: Provider = body.provider === 'openai' ? 'openai' : 'openrouter'
    const openAiChatPreset =
      body.openAiChatPreset === 'gpt-5.4-mini-none'
        ? 'gpt-5.4-mini-none'
        : body.openAiChatPreset === 'gpt-5.4-mini-low'
          ? 'gpt-5.4-mini-low'
          : 'gpt-4o-mini'
    const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
    const mode: LanguageNoteMode = body.mode === 'engvo' ? 'engvo' : 'communication'
    const rawVoice = body.communicationVoiceInputMode
    const communicationVoiceInputMode: CommunicationVoiceInputMode | null =
      mode === 'communication' && (rawVoice === 'ru' || rawVoice === 'en' || rawVoice === 'mix')
        ? rawVoice
        : null
    const correctTarget = resolveLanguageNoteCorrectTarget(mode, communicationVoiceInputMode)
    const recentAssistantText =
      typeof body.recentAssistantText === 'string' ? body.recentAssistantText : null
    const expectedEnglish =
      typeof body.expectedEnglish === 'string' ? body.expectedEnglish.trim().slice(0, 200) : null

    if (!text) {
      return NextResponse.json({ error: 'Текст для подсказки не передан' }, { status: 400 })
    }

    const messages = [
      {
        role: 'system',
        content: buildLanguageNoteSystemPrompt(audience, {
          mode,
          voiceMode: communicationVoiceInputMode,
        }),
      },
      {
        role: 'user',
        content: buildLanguageNoteUserPayload({
          text,
          recentAssistantText,
          expectedEnglish,
          mode,
          voiceMode: communicationVoiceInputMode,
        }),
      },
    ]

    const res = await (async () => {
      if (provider === 'openai') {
        const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
        if (!key) {
          return NextResponse.json(
            { error: 'На сервере не задан OPENAI_API_KEY' },
            { status: 500 }
          )
        }
        const proxyFetchExtra = await buildProxyFetchExtra()
        return fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model:
              openAiChatPreset === 'gpt-5.4-mini-none' || openAiChatPreset === 'gpt-5.4-mini-low'
                ? 'gpt-5.4-mini'
                : OPENAI_MODEL,
            ...(openAiChatPreset === 'gpt-5.4-mini-none'
              ? { reasoning_effort: 'none' }
              : openAiChatPreset === 'gpt-5.4-mini-low'
                ? { reasoning_effort: 'low' }
                : {}),
            messages,
            max_tokens: 700,
            temperature: 0.3,
          }),
          ...(proxyFetchExtra as RequestInit),
        } as RequestInit)
      }

      const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
      if (!key) {
        return NextResponse.json(
          { error: 'На сервере не задан OPENROUTER_API_KEY' },
          { status: 500 }
        )
      }
      return fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': req.nextUrl?.origin ?? '',
        },
        body: JSON.stringify({
          model: FREE_MODEL,
          messages,
          max_tokens: 700,
          temperature: 0.3,
        }),
      })
    })()

    if (res instanceof NextResponse) return res

    if (!res.ok) {
      const errText = await res.text()
      const { userMessage, errorCode } = buildProviderUserMessage({
        provider,
        status: res.status,
        errText,
        defaultMessage: 'Не удалось загрузить подсказку.',
        rateLimitMessage: 'Превышен лимит запросов. Попробуйте позже.',
      })
      return NextResponse.json(
        { error: userMessage, errorCode, provider, details: errText },
        { status: res.status }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
    }
    const first = data.choices?.[0]
    const raw = (first?.message?.content ?? first?.text ?? '').trim()
    const note = parseLanguageNoteResponse(raw, text, {
      voiceMode: communicationVoiceInputMode,
      correctTarget,
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Модель вернула некорректную подсказку.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ note: applyTeacherEtalonLock(note, expectedEnglish) })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка при загрузке подсказки' },
      { status: 500 }
    )
  }
}
