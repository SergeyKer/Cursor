import { splitEngvoAssistantRepeatCue } from '@/lib/engvo/assistantRepeatCue'
import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import { hasErrorRepeatMarkers } from '@/lib/engvo/teacherDrillCompleteness'
import { looksLikeTeacherEnglishAttempt } from '@/lib/engvo/teacherDrillProgress'

export type TeacherErrorMicroReasonResult = {
  text: string
  patched: boolean
  contrastLine: string | null
}

const BARE_SOFT_LEAD_IN_RE =
  /^(почти|чуть\s+иначе|иначе|close|almost|nearly|not\s+quite|не\s+совсем)[.!…,—–\-\s]*$/iu

/** Paired fragment contrast only — not a bare word "not". */
function hasRuFragmentContrast(text: string): boolean {
  return /так\s*:/i.test(text) && /не\s+так\s*:/i.test(text)
}

function hasEnFragmentContrast(text: string): boolean {
  return (
    /(?:^|[^\p{L}\p{N}])so\s*:/iu.test(text) &&
    /(?:^|[^\p{L}\p{N}])not\s*:/iu.test(text)
  )
}

export function hasTeacherErrorFragmentContrast(correctionBeforeMarker: string): boolean {
  const t = correctionBeforeMarker.trim()
  if (!t) return false
  return hasRuFragmentContrast(t) || hasEnFragmentContrast(t)
}

function isLowLevel(level: EngvoCefrLevel): boolean {
  return level === 'a1' || level === 'a2'
}

export function isBareSoftLeadIn(correction: string): boolean {
  const t = correction.trim()
  if (!t) return true
  return BARE_SOFT_LEAD_IN_RE.test(t)
}

function tokenizeEnglish(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
}

/**
 * First meaningful EN fragment mismatch (insertion-aware).
 * Prefers "a cat" vs "cat" over zip artifact "a" vs "cat".
 */
export function diffEnglishFragments(
  user: string,
  canon: string
): { wrong: string; right: string } | null {
  const u = tokenizeEnglish(user)
  const c = tokenizeEnglish(canon)
  if (u.length === 0 || c.length === 0) return null
  if (u.length === c.length && u.every((t, i) => t === c[i])) return null

  let i = 0
  let j = 0
  while (i < u.length && j < c.length) {
    if (u[i] === c[j]) {
      i += 1
      j += 1
      continue
    }

    // Canon inserted a token (e.g. article): … cat vs … a cat
    if (j + 1 < c.length && c[j + 1] === u[i]) {
      return { wrong: u[i]!, right: `${c[j]} ${c[j + 1]}` }
    }
    // User inserted a token
    if (i + 1 < u.length && u[i + 1] === c[j]) {
      return { wrong: `${u[i]} ${u[i + 1]}`, right: c[j]! }
    }

    return { wrong: u[i]!, right: c[j]! }
  }

  if (j < c.length && i === u.length) {
    const right = c.slice(j, j + 2).join(' ')
    const wrong = u[u.length - 1] ?? c[j]!
    if (!right.trim()) return null
    return { wrong, right }
  }
  if (i < u.length && j === c.length) {
    const wrong = u.slice(i, i + 2).join(' ')
    const right = c[c.length - 1] ?? u[i]!
    if (!wrong.trim()) return null
    return { wrong, right }
  }

  return null
}

export function formatTeacherErrorContrastLine(
  level: EngvoCefrLevel,
  wrong: string,
  right: string
): string {
  const w = wrong.trim()
  const r = right.trim()
  if (isLowLevel(level)) return `так: ${r} — не так: ${w}`
  return `so: ${r} — not: ${w}`
}

function stripTrailingLeadPunct(lead: string): string {
  return lead.replace(/[.!…,—–\-\s]+$/u, '').trim()
}

/**
 * If teacher ERROR is bare soft lead-in (or empty) without fragment contrast,
 * inject a local micro-reason from user vs canon. Otherwise no-op.
 */
export function ensureTeacherErrorMicroReason(
  rawText: string,
  params: { userText: string; level: EngvoCefrLevel }
): TeacherErrorMicroReasonResult {
  const raw = rawText.trim()
  if (!raw || !hasErrorRepeatMarkers(raw)) {
    return { text: rawText, patched: false, contrastLine: null }
  }
  if (!looksLikeTeacherEnglishAttempt(params.userText)) {
    return { text: rawText, patched: false, contrastLine: null }
  }

  const cue = splitEngvoAssistantRepeatCue(raw)
  if (!cue?.repeatText.trim()) {
    return { text: rawText, patched: false, contrastLine: null }
  }

  const correction = cue.correction.trim()
  if (hasTeacherErrorFragmentContrast(correction)) {
    return { text: rawText, patched: false, contrastLine: null }
  }
  if (correction && !isBareSoftLeadIn(correction)) {
    return { text: rawText, patched: false, contrastLine: null }
  }

  const diff = diffEnglishFragments(params.userText, cue.repeatText)
  if (!diff) {
    return { text: rawText, patched: false, contrastLine: null }
  }
  if (diff.wrong === diff.right) {
    return { text: rawText, patched: false, contrastLine: null }
  }

  const contrastLine = formatTeacherErrorContrastLine(params.level, diff.wrong, diff.right)
  const leadRaw = stripTrailingLeadPunct(correction)
  const lead =
    leadRaw ||
    (isLowLevel(params.level) ? 'Почти' : 'Close')
  const correctionOut = `${lead} — ${contrastLine}.`
  const text = `${correctionOut}\n${cue.marker}: ${cue.repeatText}`.trim()

  return { text, patched: true, contrastLine }
}
