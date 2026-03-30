const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions'
const STT_TIMEOUT_MS = 20000

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

export class SttError extends Error {
  code: 'missing_key' | 'invalid_input' | 'upstream_error' | 'timeout'
  status: number

  constructor(code: SttError['code'], message: string, status = 500) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function normalizeSttLanguage(lang: string | null | undefined): string {
  const v = (lang ?? '').trim().toLowerCase()
  if (v.startsWith('ru')) return 'ru'
  if (v.startsWith('en')) return 'en'
  return 'en'
}

/** Если не передать `language`, Whisper сам определяет язык аудио. */
export async function transcribeWithOpenAI(params: {
  audioBlob: Blob
  fileName?: string
  /** `undefined` / пусто / `auto` — без поля `language` в запросе к OpenAI. */
  language?: string | null
}): Promise<string> {
  const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
  if (!key) throw new SttError('missing_key', 'Missing OPENAI_API_KEY', 500)
  if (!params.audioBlob || params.audioBlob.size === 0) {
    throw new SttError('invalid_input', 'Audio blob is empty', 400)
  }

  const raw = (params.language ?? '').trim().toLowerCase()
  const useAutoLang = raw === '' || raw === 'auto'

  const form = new FormData()
  form.append('model', 'whisper-1')
  if (!useAutoLang) {
    form.append('language', normalizeSttLanguage(params.language))
  }
  form.append('response_format', 'json')
  form.append('file', params.audioBlob, params.fileName ?? 'speech.webm')

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), STT_TIMEOUT_MS)
  try {
    const res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
      signal: ac.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new SttError('upstream_error', errText || 'OpenAI STT request failed', res.status)
    }

    const data = (await res.json()) as { text?: string }
    const text = (data.text ?? '').trim()
    if (!text) throw new SttError('upstream_error', 'Empty STT result', 502)
    return text
  } catch (e) {
    if (e instanceof SttError) throw e
    if ((e as { name?: string })?.name === 'AbortError') {
      throw new SttError('timeout', 'STT request timed out', 504)
    }
    throw new SttError('upstream_error', e instanceof Error ? e.message : 'Unknown STT error', 502)
  } finally {
    clearTimeout(timeout)
  }
}
