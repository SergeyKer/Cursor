const ENGVO_SESSION_CONFIG_USER_MESSAGE =
  'Не удалось настроить голосовую сессию. Попробуйте ещё раз через несколько секунд.'

const ENGVO_RATE_LIMIT_USER_MESSAGE =
  'Слишком много запросов к голосовому сервису. Подождите немного и попробуйте снова.'

const ENGVO_NETWORK_USER_MESSAGE =
  'Не удалось подключиться к голосовому сервису. Попробуйте ещё раз через несколько секунд.'

const ENGVO_XAI_MISSING_KEY_USER_MESSAGE =
  'На сервере не задан XAI_API_KEY. Добавьте ключ в .env.local (локально) или в Vercel Env.'

const ENGVO_XAI_TOKEN_USER_MESSAGE =
  'Не удалось подключиться к Grok Voice. Попробуйте ещё раз.'

const ENGVO_XAI_WS_USER_MESSAGE =
  'Не удалось подключиться к Grok Voice. Попробуйте ещё раз.'

function extractOpenAiErrorMessage(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string; code?: string } | string
    }
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim()
    }
    if (parsed?.error && typeof parsed.error === 'object') {
      return parsed.error.message?.trim() ?? ''
    }
  } catch {
    // not json
  }
  return trimmed
}

function mapEngvoRealtimeApiMessage(apiMessage: string, httpStatus?: number): string | null {
  const normalized = apiMessage.toLowerCase()
  if (
    normalized.includes('invalid modalities') ||
    normalized.includes('supported combinations')
  ) {
    return ENGVO_SESSION_CONFIG_USER_MESSAGE
  }
  if (
    normalized.includes('session.type') ||
    normalized.includes('session.speed') ||
    normalized.includes('session.voice') ||
    normalized.includes('beta_api') ||
    normalized.includes('unknown parameter') ||
    normalized.includes("missing required parameter") ||
    (normalized.includes('invalid') && normalized.includes('session'))
  ) {
    return ENGVO_SESSION_CONFIG_USER_MESSAGE
  }
  if (
    httpStatus === 429 ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return ENGVO_RATE_LIMIT_USER_MESSAGE
  }
  if (
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('connection') ||
    normalized.includes('fetch failed')
  ) {
    return ENGVO_NETWORK_USER_MESSAGE
  }
  return null
}

export function resolveEngvoRealtimeUserMessage(params: {
  raw: string
  httpStatus?: number
  fallback?: string
}): { userMessage: string; apiMessage: string } {
  const apiMessage = extractOpenAiErrorMessage(params.raw) || params.raw.trim()
  const mapped = apiMessage ? mapEngvoRealtimeApiMessage(apiMessage, params.httpStatus) : null
  const userMessage =
    mapped ??
    params.fallback ??
    (apiMessage || 'Не удалось начать звонок Engvo. Попробуйте ещё раз.')
  return { userMessage, apiMessage }
}

/** Нормализует сообщение об ошибке Engvo для показа в чате (клиент). */
export function normalizeEngvoRealtimeUserMessage(raw: string, httpStatus?: number): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const parsed = JSON.parse(trimmed) as {
      userMessage?: string
      error?: { message?: string; code?: string } | string
      diagnostics?: { openAiStatus?: number }
    }
    if (typeof parsed?.userMessage === 'string' && parsed.userMessage.trim()) {
      return parsed.userMessage.trim()
    }
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      return resolveEngvoRealtimeUserMessage({
        raw: parsed.error,
        httpStatus: parsed.diagnostics?.openAiStatus ?? httpStatus,
      }).userMessage
    }
    if (parsed?.error && typeof parsed.error === 'object') {
      const detailed = parsed.error.message?.trim() ?? ''
      if (detailed) {
        return resolveEngvoRealtimeUserMessage({
          raw: detailed,
          httpStatus: parsed.diagnostics?.openAiStatus ?? httpStatus,
        }).userMessage
      }
      const fallbackCode = parsed.error.code?.trim()
      if (fallbackCode) {
        return resolveEngvoRealtimeUserMessage({ raw: fallbackCode, httpStatus }).userMessage
      }
    }
    if (parsed?.diagnostics?.openAiStatus) {
      return resolveEngvoRealtimeUserMessage({
        raw: trimmed,
        httpStatus: parsed.diagnostics.openAiStatus,
        fallback: `Ошибка Realtime (HTTP ${parsed.diagnostics.openAiStatus}).`,
      }).userMessage
    }
  } catch {
    // not json
  }

  return resolveEngvoRealtimeUserMessage({ raw: trimmed, httpStatus }).userMessage
}

export {
  ENGVO_SESSION_CONFIG_USER_MESSAGE,
  ENGVO_RATE_LIMIT_USER_MESSAGE,
  ENGVO_NETWORK_USER_MESSAGE,
  ENGVO_XAI_MISSING_KEY_USER_MESSAGE,
  ENGVO_XAI_TOKEN_USER_MESSAGE,
  ENGVO_XAI_WS_USER_MESSAGE,
}
