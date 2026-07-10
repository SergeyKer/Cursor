import { getLearningLessonById } from '@/lib/learningLessons'
import {
  LANGUAGE_NOTE_KNOWN_LESSONS,
} from '@/lib/languageNote/prompt'
import {
  LANGUAGE_NOTE_MAX_ALTERNATIVE_CHARS,
  LANGUAGE_NOTE_MAX_ALTERNATIVES,
  LANGUAGE_NOTE_MAX_BETTER_REASONS,
  LANGUAGE_NOTE_MAX_REASON_CHARS,
  LANGUAGE_NOTE_MAX_REASONS,
  LANGUAGE_NOTE_MAX_TOPIC_TITLE_CHARS,
  LANGUAGE_NOTE_MAX_TOPICS,
  type LanguageNote,
  type LanguageNoteCorrectTarget,
  type LanguageNoteReviewTopic,
  type LanguageNoteStatus,
} from '@/lib/languageNote/types'
import type { CommunicationVoiceInputMode } from '@/lib/types'

const REASON_JUNK_START_RE =
  /^(так\s+звучит|более\s+правильно|есть\s+несколько\s+ошибок|попробуйте|практикуйтесь|неправильно|ошибка\b|use\b|chang)/i

/** Сухой EN-filler и «уроки» про пунктуацию TTS — не показываем ученику. */
function isJunkReason(text: string): boolean {
  if (REASON_JUNK_START_RE.test(text)) return true
  if (/\bfor past action\b/i.test(text)) return true
  if (/\bsounds better\b/i.test(text)) return true
  if (/\bperiod after\b/i.test(text)) return true
  if (/\bquestion mark/i.test(text)) return true
  if (/\badded a period\b/i.test(text)) return true
  if (/\badded question mark/i.test(text)) return true
  if (/\bfor clear separation\b/i.test(text)) return true
  if (/знак(а|ов)?\s+препинания/i.test(text)) return true
  if (/добав(ил|ила|или|ьте|лять)?\s+точк/i.test(text)) return true
  if (/добав(ил|ила|или|ьте|лять)?\s+вопросительн/i.test(text)) return true
  return false
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((x) => asString(x)).filter(Boolean)
}

function normalizeStatus(raw: unknown, hasBetter: boolean): LanguageNoteStatus {
  if (raw === 'already_good' || raw === 'needs_fix' || raw === 'needs_better') return raw
  return hasBetter ? 'needs_better' : 'needs_fix'
}

function cleanReasons(raw: unknown, max: number): string[] {
  const out: string[] = []
  for (const item of asStringArray(raw)) {
    const clipped = item.slice(0, LANGUAGE_NOTE_MAX_REASON_CHARS).trim()
    if (!clipped) continue
    if (isJunkReason(clipped)) continue
    if (clipped.length < 8) continue
    out.push(clipped)
    if (out.length >= max) break
  }
  return out
}

const LANGUAGE_NOTE_MAX_HIGHLIGHTS = 4

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True if `needle` appears in `haystack` as a contiguous phrase (case-insensitive). */
function containsPhraseInsensitive(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase().trim()
  if (!n) return false
  if (n.includes(' ')) return h.includes(n)
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(n)}(?=$|[^\\p{L}\\p{N}])`, 'iu')
  return re.test(haystack)
}

function extractAfterArrowTargets(reasons: string[]): string[] {
  const out: string[] = []
  for (const reason of reasons) {
    // Capture full English phrases around arrows: have → has, many → a lot of
    const re =
      /(?:^|[^A-Za-z])([A-Za-z][A-Za-z']*(?:\s+[A-Za-z][A-Za-z']*){0,4})\s*(?:→|->)\s*([A-Za-z][A-Za-z']*(?:\s+[A-Za-z][A-Za-z']*){0,4})(?=$|[^A-Za-z'])/g
    let m: RegExpExecArray | null
    while ((m = re.exec(reason)) !== null) {
      const after = (m[2] ?? '').trim()
      if (after.length >= 2) out.push(after)
    }
  }
  return out
}

/**
 * Keep only highlights that are real changes vs the previous layer.
 * Prefer arrow targets from reasons when model highlights are noisy.
 */
export function sanitizeChangedHighlights(params: {
  previous: string
  next: string
  highlights: string[]
  reasons?: string[]
}): string[] {
  const { previous, next, reasons = [] } = params
  if (!next.trim()) return []

  const candidates = [
    ...params.highlights,
    ...extractAfterArrowTargets(reasons),
  ]
    .map((h) => h.trim())
    .filter(Boolean)

  const out: string[] = []
  const seen = new Set<string>()

  for (const raw of candidates) {
    let h = raw
    if (!next.includes(h)) {
      const capped = h.charAt(0).toUpperCase() + h.slice(1)
      const lowered = h.charAt(0).toLowerCase() + h.slice(1)
      if (next.includes(capped)) h = capped
      else if (next.includes(lowered)) h = lowered
      else continue
    }

    // Unchanged vs previous layer → drop (this kills false "cat" / "from" bolds).
    if (containsPhraseInsensitive(previous, h)) continue

    // Never bold almost the whole sentence.
    if (h.length >= Math.max(24, Math.floor(next.length * 0.55))) continue

    const key = h.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
    if (out.length >= LANGUAGE_NOTE_MAX_HIGHLIGHTS) break
  }

  return out
}

function normalizeTopics(raw: unknown): LanguageNoteReviewTopic[] {
  if (!Array.isArray(raw)) return []
  const out: LanguageNoteReviewTopic[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const id = asString((item as { id?: unknown }).id)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const title = asString((item as { title?: unknown }).title)
    if (!id || !title) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, title: title.slice(0, LANGUAGE_NOTE_MAX_TOPIC_TITLE_CHARS) })
    if (out.length >= LANGUAGE_NOTE_MAX_TOPICS) break
  }
  return out
}

function normalizeLessonId(raw: unknown): string | null {
  const id = asString(raw)
  if (!id) return null
  return LANGUAGE_NOTE_KNOWN_LESSONS.some((l) => l.id === id) ? id : null
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

function sentencesEqualLoose(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}

/** Слова совпадают, отличаются только пунктуация/регистр (типичный TTS). */
export function equalsIgnoringPunctuation(a: string, b: string): boolean {
  return sentencesEqualLoose(a, b)
}

const PRAISE_FALLBACK = 'Здорово — мысль ясна, так и оставляем.'
const FIX_FALLBACK = 'Вот аккуратный вариант без сбоев в грамматике.'

/** Corrected display sentence: capital start + terminal `.` (keep `?` / `!`). */
export function normalizeDisplaySentence(raw: string): string {
  let text = raw.trim().replace(/^["'«»]+|["'«»]+$/g, '').trim()
  if (!text) return ''

  const firstLetterIndex = text.search(/\p{L}/u)
  if (firstLetterIndex >= 0) {
    const ch = text[firstLetterIndex]
    text =
      text.slice(0, firstLetterIndex) +
      ch.toUpperCase() +
      text.slice(firstLetterIndex + 1)
  }

  if (!/[.!?…]$/u.test(text)) {
    text = `${text}.`
  }
  return text
}

const LATIN_RE = /[A-Za-z]/
const CYRILLIC_RE = /\p{Script=Cyrillic}/u

/** En/Mix: русский-only correct — ошибка модели. Ru: английский-only на длинной фразе — тоже. */
export function isWrongCorrectTargetLanguage(
  correct: string,
  target: LanguageNoteCorrectTarget
): boolean {
  const hasLatin = LATIN_RE.test(correct)
  const hasCyrillic = CYRILLIC_RE.test(correct)
  if (target === 'en') {
    return hasCyrillic && !hasLatin
  }
  // ru: целиком английская фраза из 3+ слов без кириллицы
  if (!hasCyrillic && hasLatin) {
    return correct.trim().split(/\s+/).filter(Boolean).length >= 3
  }
  return false
}

export function parseLanguageNoteResponse(
  raw: string,
  fallbackOriginal: string,
  options?: {
    voiceMode?: CommunicationVoiceInputMode | null
    correctTarget?: LanguageNoteCorrectTarget
  }
): LanguageNote | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFence(raw))
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    try {
      parsed = JSON.parse(raw.slice(start, end + 1))
    } catch {
      return null
    }
  }

  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  const original = asString(obj.original) || fallbackOriginal
  const correctRaw = asString(obj.correct)
  if (!correctRaw) return null
  const correct = normalizeDisplaySentence(correctRaw)
  const correctTarget = options?.correctTarget ?? 'en'
  const voiceMode = options?.voiceMode ?? null

  if (isWrongCorrectTargetLanguage(correct, correctTarget)) {
    return null
  }

  let betterRaw = asString(obj.better) || null
  let better = betterRaw ? normalizeDisplaySentence(betterRaw) : null
  let betterAlternatives = asStringArray(obj.betterAlternatives)
    .map(normalizeDisplaySentence)
    .filter(Boolean)
    .filter(
      (alt) =>
        !sentencesEqualLoose(alt, correct) &&
        !(better && sentencesEqualLoose(alt, better)) &&
        alt.length <= LANGUAGE_NOTE_MAX_ALTERNATIVE_CHARS
    )
    .slice(0, LANGUAGE_NOTE_MAX_ALTERNATIVES)

  // Long multi-clause originals: keep one better phrase, drop alternative walls of text.
  if (correct.split(/\s+/).length >= 14) {
    betterAlternatives = []
  }

  if (better && sentencesEqualLoose(better, correct) && betterAlternatives.length === 0) {
    better = null
  }

  // If model only returned alternatives, promote the first short one to better.
  if (!better && betterAlternatives.length > 0) {
    better = betterAlternatives[0] ?? null
    betterAlternatives = betterAlternatives.slice(1)
    betterRaw = better
  }

  if (better && isWrongCorrectTargetLanguage(better, correctTarget)) {
    better = null
    betterAlternatives = []
  }
  betterAlternatives = betterAlternatives.filter(
    (alt) => !isWrongCorrectTargetLanguage(alt, correctTarget)
  )

  let correctReasons = cleanReasons(obj.correctReasons, LANGUAGE_NOTE_MAX_REASONS)
  let betterReasons = better
    ? cleanReasons(obj.betterReasons, LANGUAGE_NOTE_MAX_BETTER_REASONS)
    : []
  if (!better) betterReasons = []

  let reviewTopics = normalizeTopics(obj.reviewTopics)

  // Только пунктуация/регистр — не урок, а похвала.
  const punctuationOnly =
    equalsIgnoringPunctuation(original, correct) && !better && betterAlternatives.length === 0

  let status = normalizeStatus(obj.status, Boolean(better) || betterAlternatives.length > 0)
  if (punctuationOnly) {
    status = 'already_good'
  }

  if (status === 'already_good') {
    better = null
    betterAlternatives = []
    betterReasons = []
    reviewTopics = []
    if (punctuationOnly || correctReasons.length === 0) {
      correctReasons = [PRAISE_FALLBACK]
    } else {
      correctReasons = correctReasons.slice(0, 1)
    }
  } else if (correctReasons.length === 0) {
    // Слова отличаются, но модель отдала только junk/пунктуацию — правка реальная.
    correctReasons = [FIX_FALLBACK]
  }

  const lessonId = normalizeLessonId(obj.lessonId)
  const lessonTitle = lessonId
    ? getLearningLessonById(lessonId)?.title ??
      LANGUAGE_NOTE_KNOWN_LESSONS.find((l) => l.id === lessonId)?.title ??
      null
    : null

  return {
    status: status === 'already_good' ? 'already_good' : better || betterAlternatives.length ? 'needs_better' : 'needs_fix',
    original,
    correct,
    correctHighlights: sanitizeChangedHighlights({
      previous: original,
      next: correct,
      highlights: asStringArray(obj.correctHighlights),
      reasons: correctReasons,
    }),
    correctReasons,
    better,
    betterHighlights: better
      ? sanitizeChangedHighlights({
          previous: correct,
          next: better,
          highlights: asStringArray(obj.betterHighlights),
          reasons: betterReasons,
        })
      : [],
    betterReasons,
    betterAlternatives,
    reviewTopics,
    lessonId,
    lessonTitle,
    voiceMode,
    correctTarget,
  }
}
