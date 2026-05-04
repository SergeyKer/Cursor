/** Дефолтный таймаут одного HTTP-запроса к LLM (мс). Переопределение: `LESSON_PROVIDER_FETCH_TIMEOUT_MS`. */
export const LESSON_PROVIDER_FETCH_TIMEOUT_MS_DEFAULT = 25_000

/**
 * Максимум попыток в `/api/lesson-repeat` при `bypassCache` (меню «Сгенерировать урок»).
 * Держите в синхроне с `app/api/lesson-repeat/route.ts`. Значение 1 ускоряет худший случай (один вызов LLM).
 * Переопределение: `LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS` или `NEXT_PUBLIC_LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS` (целое 1–2, для клиента — только public).
 */
export const LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS = 1

export function resolveLessonRepeatMenuBypassMaxAttempts(): number {
  const raw =
    (typeof process !== 'undefined' ? process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS : undefined)?.trim() ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS : undefined)?.trim() ||
    ''
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return Math.min(Math.max(n, 1), 2)
  }
  return LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS
}

/** Верхняя граница max_tokens для `/api/lesson-repeat` при bypassCache (ускорение генерации). */
export const LESSON_REPEAT_MENU_BYPASS_MAX_OUTPUT_TOKENS_CAP = 900

/** Запас на парсинг JSON / валидацию между попытками и сетевой оверхед. */
export const LESSON_MENU_GENERATE_CLIENT_BUFFER_MS = 10_000

export function resolveLessonProviderFetchTimeoutMs(): number {
  const raw = process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS?.trim()
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return Math.min(Math.max(n, 5_000), 300_000)
  }
  return LESSON_PROVIDER_FETCH_TIMEOUT_MS_DEFAULT
}

/** Таймаут fetch на клиенте для `/api/lesson-repeat`: должен быть ≥ серверного бюджета попыток. */
export function lessonMenuGenerateClientTimeoutMs(providerTimeoutMs: number): number {
  return resolveLessonRepeatMenuBypassMaxAttempts() * providerTimeoutMs + LESSON_MENU_GENERATE_CLIENT_BUFFER_MS
}

export function isLessonProviderAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchWithLessonProviderDeadline(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  options?: { deadlineMs?: number }
): Promise<Response> {
  const ms =
    typeof options?.deadlineMs === 'number' && Number.isFinite(options.deadlineMs)
      ? Math.min(Math.max(options.deadlineMs, 5), 300_000)
      : resolveLessonProviderFetchTimeoutMs()
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  try {
    return await doFetch(ac.signal)
  } finally {
    clearTimeout(timer)
  }
}
