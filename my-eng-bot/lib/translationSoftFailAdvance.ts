/**
 * Soft-fail advance: выход из цикла ошибок перевода без SUCCESS/галочки.
 * Маркер Комментарий_выход + следующее RU-задание, без Скажи/Ошибки.
 */

export const TRANSLATION_SOFT_FAIL_COMMENT_MARKER = 'Комментарий_выход'

const SOFT_FAIL_MARKER_RE = /(?:^|\n)\s*Комментарий_выход\s*:/im
const NEXT_DRILL_RE = /(?:^|\n)\s*(?:Переведи|Переведите)\s+далее\s*:/im
const SAY_RE = /(?:^|\n)\s*(?:Скажи|Say)\s*:/im
const ERRORS_RE = /(?:^|\n)\s*Ошибки\s*:/im
const JUNK_RE = /(?:^|\n)\s*Комментарий_мусор\s*:/im

const ADULT_POOL = [
  'Пока не попали — бывает. Засчитаем как ошибку и идём дальше.',
  'Сейчас мимо, но ты стараешься — это важно. Берём следующее предложение.',
  'Здесь застряли бы. Не попали в этот раз — двигаемся дальше.',
] as const

const CHILD_POOL = [
  'Сейчас не вышло — ничего страшного. Идём к следующему предложению.',
  'Пока мимо, но ты стараешься. Берём следующее задание.',
  'Здесь сложно — бывает. Не попали сейчас, двигаемся дальше.',
] as const

function pickDeterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % length
}

export function hasTranslationSoftFailMarker(content: string): boolean {
  return SOFT_FAIL_MARKER_RE.test(content.trim())
}

/** Извлекает тело Комментарий_выход (одна строка; не глотает перевод строки). */
export function extractTranslationSoftFailCommentBody(content: string): string | null {
  const t = content.trim()
  const oneLine = /(?:^|\n)[^\S\r\n]*Комментарий_выход[^\S\r\n]*:[^\S\r\n]*([^\n]*)/im.exec(t)
  const head = oneLine?.[1]?.trim() ?? ''
  return head || null
}

/**
 * Валидный soft-fail payload: маркер + Переведи далее + нет Скажи/Ошибки/мусор + непустой bridge.
 */
export function isValidTranslationSoftFailAdvancePayload(content: string): boolean {
  const t = content.trim()
  if (!t || !hasTranslationSoftFailMarker(t)) return false
  if (!NEXT_DRILL_RE.test(t)) return false
  if (SAY_RE.test(t) || ERRORS_RE.test(t) || JUNK_RE.test(t)) return false
  const body = extractTranslationSoftFailCommentBody(t)
  return Boolean(body?.trim())
}

export function pickTranslationSoftFailAdvanceComment(params: {
  seed: string
  audience: 'child' | 'adult'
}): string {
  const pool = params.audience === 'child' ? CHILD_POOL : ADULT_POOL
  return pool[pickDeterministicIndex(params.seed, pool.length)] ?? pool[0]!
}

export function buildTranslationSoftFailAdvancePayload(params: {
  seed: string
  nextRu: string
  audience: 'child' | 'adult'
}): string {
  const nextRu = params.nextRu.replace(/\s+/g, ' ').trim()
  const comment = pickTranslationSoftFailAdvanceComment({
    seed: params.seed,
    audience: params.audience,
  })
  return [`${TRANSLATION_SOFT_FAIL_COMMENT_MARKER}: ${comment}`, `Переведи далее: ${nextRu}`].join('\n')
}
