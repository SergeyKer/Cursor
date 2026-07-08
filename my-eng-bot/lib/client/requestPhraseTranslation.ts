import type { Audience } from '@/lib/types'

const API_TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2500
const RETRY_DELAY_RATE_LIMIT_MS = 20_000

type TranslateProvider = 'openrouter' | 'openai'

type TranslateErrorCode = 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' | undefined

type TranslateResponse = {
  content?: string
  error?: string
  errorCode?: TranslateErrorCode
  provider?: TranslateProvider
}

type AttemptResult =
  | { ok: true; content: string }
  | { ok: false; error: string; errorCode?: TranslateErrorCode; provider: TranslateProvider }

export type RequestPhraseTranslationOptions = {
  text: string
  provider: TranslateProvider
  openAiChatPreset?: string
  audience: Audience
  signal?: AbortSignal
}

export type RequestPhraseTranslationResult =
  | { ok: true; translation: string }
  | { ok: false; error: string }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableTranslationError(message: string): boolean {
  return (
    message.startsWith('Превышен лимит') ||
    message.startsWith('Модель вернула пустой перевод') ||
    message.startsWith('Ответ занял слишком много времени') ||
    message.startsWith('Нет связи с сервером') ||
    message.startsWith('Не удалось загрузить перевод')
  )
}

async function requestTranslateOnce(
  text: string,
  provider: TranslateProvider,
  openAiChatPreset: string | undefined,
  audience: Audience,
  externalSignal?: AbortSignal
): Promise<AttemptResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort)

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        provider,
        openAiChatPreset,
        audience,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    let data: TranslateResponse
    try {
      data = (await res.json()) as TranslateResponse
    } catch {
      data = {
        error: res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.',
        errorCode: res.status === 429 ? 'rate_limit' : 'upstream_error',
        provider,
      }
    }
    const content = data.content?.trim()
    if (content && res.ok) return { ok: true, content }
    return {
      ok: false,
      error: data.error ?? (res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.'),
      errorCode: data.errorCode,
      provider: data.provider ?? provider,
    }
  } catch (e) {
    clearTimeout(timeoutId)
    const err = e instanceof Error ? e : new Error('Unknown error')
    const translatedError =
      err.name === 'AbortError'
        ? 'Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.'
        : err.message === 'Failed to fetch' || err.name === 'TypeError'
          ? 'Нет связи с сервером. Проверьте интернет и ключ в меню.'
          : 'Не удалось загрузить перевод.'
    return { ok: false, error: translatedError, provider }
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

export async function requestPhraseTranslation(
  options: RequestPhraseTranslationOptions
): Promise<RequestPhraseTranslationResult> {
  const trimmed = options.text.trim()
  if (!trimmed) {
    return { ok: false, error: 'Не удалось загрузить перевод.' }
  }

  const provider = options.provider
  let lastError = 'Не удалось загрузить перевод.'
  const maxAttemptsForProvider = provider === 'openrouter' ? MAX_ATTEMPTS : 1

  for (let attempt = 0; attempt < maxAttemptsForProvider; attempt++) {
    if (options.signal?.aborted) {
      return { ok: false, error: lastError }
    }

    const result = await requestTranslateOnce(
      trimmed,
      provider,
      options.openAiChatPreset,
      options.audience,
      options.signal
    )

    if (result.ok) {
      return { ok: true, translation: result.content }
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
      attempt < maxAttemptsForProvider - 1 && (isRateLimit || isNetworkLike || isRetryableTranslationError(lastError))
    if (!canRetryThisProvider) break

    await sleep(150)
    const backoffMs = isRateLimit ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
    await sleep(backoffMs)
  }

  return { ok: false, error: lastError }
}
