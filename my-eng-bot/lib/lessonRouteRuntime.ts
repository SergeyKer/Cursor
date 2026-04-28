type LessonRouteMode = 'generate' | 'repeat' | 'blueprint'

type CachedLessonRouteValue<T> = {
  expiresAt: number
  value: T
}

const LESSON_ROUTE_CACHE_TTL_MS = 2 * 60 * 1000
const lessonRouteCache = new Map<string, CachedLessonRouteValue<unknown>>()
const lessonRouteInflight = new Map<string, Promise<unknown>>()

function isFlagEnabled(rawValue: string | undefined, defaultValue: boolean): boolean {
  const value = rawValue?.trim()
  if (!value) return defaultValue
  return !/^(?:0|false|off|no)$/i.test(value)
}

function isLessonRouteCacheEnabled(): boolean {
  return process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true'
}

export function isLessonRouteDedupeEnabled(): boolean {
  return isFlagEnabled(process.env.LESSON_LATENCY_DEDUP_ENABLED, true)
}

export function isLessonProviderWarmupEnabled(): boolean {
  return isFlagEnabled(process.env.LESSON_PROVIDER_WARMUP_ENABLED, false)
}

export function createLessonRouteCorrelationId(mode: LessonRouteMode): string {
  return `lesson-${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function resolveLessonRouteMaxTokens(level: string, mode: LessonRouteMode): number {
  const normalizedLevel = level.trim().toUpperCase()
  if (normalizedLevel === 'A1' || normalizedLevel === 'A2') {
    return mode === 'generate' ? 1400 : 1200
  }
  if (normalizedLevel === 'B1' || normalizedLevel === 'B2') {
    return mode === 'generate' ? 1800 : 1500
  }
  return mode === 'generate' ? 2200 : 1800
}

export function buildLessonRouteCacheKey(params: {
  mode: LessonRouteMode
  lessonId: string
  selectedVariantId: string | null
  audience: string
  provider: string
  openAiChatPreset: string
}): string {
  return [
    params.mode,
    params.lessonId,
    params.selectedVariantId ?? 'default',
    params.audience,
    params.provider,
    params.openAiChatPreset,
  ].join('::')
}

export function buildLessonBlueprintCacheKey(params: {
  topic: string
  level: string
  audience: string
  provider: string
  openAiChatPreset: string
  analysisSummary?: string
}): string {
  return [
    'blueprint',
    params.topic.trim(),
    params.level.trim(),
    params.audience.trim(),
    params.provider.trim(),
    params.openAiChatPreset.trim(),
    params.analysisSummary?.trim() ?? '',
  ].join('::')
}

export function readLessonRouteCache<T>(cacheKey: string): T | null {
  if (!isLessonRouteCacheEnabled()) return null
  const cached = lessonRouteCache.get(cacheKey)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    lessonRouteCache.delete(cacheKey)
    return null
  }
  return cloneSerializable(cached.value as T)
}

export function writeLessonRouteCache<T>(cacheKey: string, value: T): void {
  if (!isLessonRouteCacheEnabled()) return
  lessonRouteCache.set(cacheKey, {
    expiresAt: Date.now() + LESSON_ROUTE_CACHE_TTL_MS,
    value: cloneSerializable(value),
  })
}

export async function runLessonRouteInflight<T>(cacheKey: string, factory: () => Promise<T>): Promise<T> {
  if (!isLessonRouteDedupeEnabled()) {
    return factory()
  }
  const existing = lessonRouteInflight.get(cacheKey) as Promise<T> | undefined
  if (existing) {
    return cloneSerializable(await existing)
  }
  const promise = (async () => cloneSerializable(await factory()))()
  lessonRouteInflight.set(cacheKey, promise as Promise<unknown>)
  try {
    return cloneSerializable(await promise)
  } finally {
    if (lessonRouteInflight.get(cacheKey) === promise) {
      lessonRouteInflight.delete(cacheKey)
    }
  }
}

export function logLessonRouteSummary(params: {
  correlationId: string
  mode: LessonRouteMode
  lessonId: string
  selectedVariantId: string | null
  durationMs: number
  source: 'provider' | 'cache'
  generated: boolean
  fallback: boolean
}): void {
  console.info(
    `[${params.correlationId}] lesson-${params.mode} lesson=${params.lessonId} variant=${params.selectedVariantId ?? 'default'} source=${params.source} generated=${params.generated} fallback=${params.fallback} duration_ms=${params.durationMs}`
  )
}

export function logLessonRouteStages(params: {
  correlationId: string
  mode: LessonRouteMode
  stages: Record<string, number | undefined>
}): void {
  const entries = Object.entries(params.stages).filter(([, value]) => typeof value === 'number')
  if (entries.length === 0) return
  const body = entries.map(([key, value]) => `${key}=${value}`).join(' ')
  console.info(`[${params.correlationId}] lesson-${params.mode}-stages ${body}`)
}

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}
