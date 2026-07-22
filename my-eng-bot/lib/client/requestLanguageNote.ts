import type { Audience, CommunicationVoiceInputMode } from '@/lib/types'
import type { LanguageNote, LanguageNoteMode } from '@/lib/languageNote/types'
import { truncateLanguageNoteInput } from '@/lib/languageNote/eligibility'

const API_TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2500
const RETRY_DELAY_RATE_LIMIT_MS = 20_000

type NoteProvider = 'openrouter' | 'openai'

type NoteErrorCode = 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' | undefined

type NoteResponse = {
  note?: LanguageNote
  error?: string
  errorCode?: NoteErrorCode
  provider?: NoteProvider
}

type AttemptResult =
  | { ok: true; note: LanguageNote }
  | { ok: false; error: string; errorCode?: NoteErrorCode; provider: NoteProvider; aborted?: boolean }

export type RequestLanguageNoteOptions = {
  text: string
  provider: NoteProvider
  openAiChatPreset?: string
  audience: Audience
  mode: LanguageNoteMode
  communicationVoiceInputMode?: CommunicationVoiceInputMode | null
  recentAssistantText?: string | null
  expectedEnglish?: string | null
  signal?: AbortSignal
}

export type RequestLanguageNoteResult =
  | { ok: true; note: LanguageNote }
  | { ok: false; error: string; aborted?: boolean }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableNoteError(message: string): boolean {
  return (
    message.startsWith('Превышен лимит') ||
    message.startsWith('Модель вернула некорректную подсказку') ||
    message.startsWith('Ответ занял слишком много времени') ||
    message.startsWith('Нет связи с сервером') ||
    message.startsWith('Не удалось загрузить подсказку')
  )
}

async function requestLanguageNoteOnce(
  options: RequestLanguageNoteOptions
): Promise<AttemptResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const externalSignal = options.signal

  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort)

  try {
    const res = await fetch('/api/language-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: truncateLanguageNoteInput(options.text),
        provider: options.provider,
        openAiChatPreset: options.openAiChatPreset,
        audience: options.audience,
        mode: options.mode,
        communicationVoiceInputMode: options.communicationVoiceInputMode ?? null,
        recentAssistantText: options.recentAssistantText ?? null,
        expectedEnglish: options.expectedEnglish?.trim()
          ? options.expectedEnglish.trim().slice(0, 200)
          : null,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    let data: NoteResponse
    try {
      data = (await res.json()) as NoteResponse
    } catch {
      data = {
        error:
          res.status === 502
            ? 'Модель вернула некорректную подсказку.'
            : 'Не удалось загрузить подсказку.',
        errorCode: res.status === 429 ? 'rate_limit' : 'upstream_error',
        provider: options.provider,
      }
    }
    if (data.note && res.ok) return { ok: true, note: data.note }
    return {
      ok: false,
      error:
        data.error ??
        (res.status === 502
          ? 'Модель вернула некорректную подсказку.'
          : 'Не удалось загрузить подсказку.'),
      errorCode: data.errorCode,
      provider: data.provider ?? options.provider,
    }
  } catch (e) {
    clearTimeout(timeoutId)
    const err = e instanceof Error ? e : new Error('Unknown error')
    const aborted = err.name === 'AbortError' || Boolean(externalSignal?.aborted)
    if (aborted && externalSignal?.aborted) {
      return { ok: false, error: 'aborted', provider: options.provider, aborted: true }
    }
    const translatedError =
      err.name === 'AbortError'
        ? 'Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.'
        : err.message === 'Failed to fetch' || err.name === 'TypeError'
          ? 'Нет связи с сервером. Проверьте интернет и ключ в меню.'
          : 'Не удалось загрузить подсказку.'
    return { ok: false, error: translatedError, provider: options.provider, aborted }
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

export async function requestLanguageNote(
  options: RequestLanguageNoteOptions
): Promise<RequestLanguageNoteResult> {
  const trimmed = truncateLanguageNoteInput(options.text)
  if (!trimmed) {
    return { ok: false, error: 'Не удалось загрузить подсказку.' }
  }

  const provider = options.provider
  let lastError = 'Не удалось загрузить подсказку.'
  const maxAttemptsForProvider = provider === 'openrouter' ? MAX_ATTEMPTS : 1

  for (let attempt = 0; attempt < maxAttemptsForProvider; attempt++) {
    if (options.signal?.aborted) {
      return { ok: false, error: lastError, aborted: true }
    }

    const result = await requestLanguageNoteOnce({ ...options, text: trimmed })

    if (result.ok) {
      return { ok: true, note: result.note }
    }

    if (result.aborted) {
      return { ok: false, error: result.error, aborted: true }
    }

    lastError = result.error
    const isRateLimit = result.errorCode === 'rate_limit' || /лимит|Too Many Requests/i.test(lastError)
    const isForbidden = result.errorCode === 'forbidden'
    const isUnauthorized = result.errorCode === 'unauthorized'
    const isNetworkLike = /Нет связи с сервером|занял слишком много времени/i.test(lastError)

    if (provider === 'openai' && (isForbidden || isUnauthorized)) {
      break
    }

    const canRetryThisProvider =
      attempt < maxAttemptsForProvider - 1 &&
      (isRateLimit || isNetworkLike || isRetryableNoteError(lastError))
    if (!canRetryThisProvider) break

    await sleep(150)
    const backoffMs = isRateLimit ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
    await sleep(backoffMs)
  }

  return { ok: false, error: lastError }
}
