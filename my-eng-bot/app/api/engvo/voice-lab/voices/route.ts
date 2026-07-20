import { NextRequest, NextResponse } from 'next/server'
import { isValidVoiceLabPassword } from '@/lib/engvo/voiceLab/gatePassword'
import {
  isEngvoCustomVoiceIdFormat,
  listEngvoCustomVoices,
} from '@/lib/engvo/voiceLab/customVoicesManifest'
import { upsertCustomVoiceInManifest } from '@/lib/engvo/voiceLab/manifestStore'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'

export const runtime = 'nodejs'

const XAI_CUSTOM_VOICES_URL = 'https://api.x.ai/v1/custom-voices'
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 10

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_MAX) return false
  bucket.count += 1
  return true
}

function requirePassword(req: NextRequest): NextResponse | null {
  const password = req.headers.get('x-voice-lab-password')?.trim() ?? ''
  if (!isValidVoiceLabPassword(password)) {
    return NextResponse.json({ error: 'unauthorized', userMessage: 'Неверный пароль.' }, { status: 401 })
  }
  return null
}

export async function GET() {
  const voices = listEngvoCustomVoices().map((v) => ({
    voiceId: v.voiceId,
    name: v.name,
    createdAt: v.createdAt ?? null,
  }))
  return NextResponse.json({ voices })
}

export async function POST(req: NextRequest) {
  const authError = requirePassword(req)
  if (authError) return authError
  if (!checkRateLimit(clientIp(req))) {
    return NextResponse.json({ error: 'rate_limit', userMessage: 'Слишком много запросов. Подождите.' }, { status: 429 })
  }

  const mode = req.nextUrl.searchParams.get('mode') ?? 'create'

  if (mode === 'register') {
    const body = (await req.json().catch(() => ({}))) as { voiceId?: string; name?: string }
    const voiceId = body.voiceId?.trim() ?? ''
    const name = body.name?.trim() ?? ''
    if (!isEngvoCustomVoiceIdFormat(voiceId)) {
      return NextResponse.json(
        { error: 'invalid_voice_id', userMessage: 'voice_id: 8–16 символов [a-z0-9].' },
        { status: 400 }
      )
    }
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { error: 'invalid_name', userMessage: 'Имя голоса: от 2 до 40 символов.' },
        { status: 400 }
      )
    }
    const entry = { voiceId, name, createdAt: new Date().toISOString() }
    const { wrote, voices } = upsertCustomVoiceInManifest(entry)
    return NextResponse.json({
      voice: entry,
      wroteToDisk: wrote,
      voices,
      manifestSnippet: JSON.stringify({ voices }, null, 2),
      hint: wrote
        ? null
        : 'На production файл не записан. Скопируйте manifestSnippet в data/engvo-custom-voices.json и задеплойте.',
    })
  }

  if (mode !== 'create') {
    return NextResponse.json({ error: 'bad_mode', userMessage: 'Неизвестный mode.' }, { status: 400 })
  }

  const key = normalizeKey(process.env.XAI_API_KEY ?? '')
  if (!key) {
    return NextResponse.json(
      { error: 'missing_key', userMessage: 'XAI_API_KEY не задан на сервере.' },
      { status: 500 }
    )
  }

  const form = await req.formData().catch(() => null)
  if (!form) {
    return NextResponse.json({ error: 'bad_form', userMessage: 'Ожидался multipart form-data.' }, { status: 400 })
  }
  const name = String(form.get('name') ?? '').trim()
  const file = form.get('file')
  if (name.length < 2 || name.length > 40) {
    return NextResponse.json(
      { error: 'invalid_name', userMessage: 'Имя голоса: от 2 до 40 символов.' },
      { status: 400 }
    )
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file', userMessage: 'Нужен файл записи.' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'file_size', userMessage: 'Файл слишком большой или пустой (макс. 15 MB).' },
      { status: 400 }
    )
  }

  const upstreamForm = new FormData()
  upstreamForm.append('file', file, file.name || 'reference.webm')
  upstreamForm.append('name', name)
  upstreamForm.append('language', 'en')
  upstreamForm.append('use_case', 'conversational')
  upstreamForm.append('tone', 'warm')

  const upstream = await fetchWithProxyFallback(XAI_CUSTOM_VOICES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: upstreamForm,
  })
  const rawText = await upstream.text()
  let parsed: { voice_id?: string; error?: string } = {}
  try {
    parsed = JSON.parse(rawText) as { voice_id?: string; error?: string }
  } catch {
    // keep raw
  }

  if (!upstream.ok) {
    const code = upstream.status === 403 ? 'custom_voices_unavailable' : 'upstream_error'
    return NextResponse.json(
      {
        error: code,
        status: upstream.status,
        detail: rawText.slice(0, 500),
        userMessage:
          upstream.status === 403
            ? 'Создание через API недоступно на этом ключе. Создайте голос в xAI Console и зарегистрируйте voice_id.'
            : 'Не удалось создать голос в xAI. Попробуйте позже или зарегистрируйте ID вручную.',
      },
      { status: upstream.status === 403 ? 403 : 502 }
    )
  }

  const voiceId = parsed.voice_id?.trim() ?? ''
  if (!isEngvoCustomVoiceIdFormat(voiceId)) {
    return NextResponse.json(
      {
        error: 'bad_upstream',
        userMessage: 'xAI не вернул корректный voice_id.',
        detail: rawText.slice(0, 500),
      },
      { status: 502 }
    )
  }

  const entry = { voiceId, name, createdAt: new Date().toISOString() }
  const { wrote, voices } = upsertCustomVoiceInManifest(entry)
  return NextResponse.json({
    voice: entry,
    wroteToDisk: wrote,
    voices,
    manifestSnippet: JSON.stringify({ voices }, null, 2),
    hint: wrote
      ? null
      : 'На production файл не записан. Скопируйте manifestSnippet в data/engvo-custom-voices.json и задеплойте.',
  })
}
