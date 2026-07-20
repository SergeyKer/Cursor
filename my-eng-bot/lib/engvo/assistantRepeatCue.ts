import { stripWrappingQuotes } from '@/lib/translationProtocolLines'

export type EngvoRepeatCueMarker = 'Say' | 'Скажи' | 'Repeat' | 'Повтори'

export type EngvoAssistantRepeatCue = {
  correction: string
  marker: EngvoRepeatCueMarker
  repeatText: string
}

const MARKER_START_RE = /^(Скажи|Say|Повтори|Repeat)\s*:?\s*(.*)$/i

/** Inline Latin markers: after start or sentence end (mirrors extractTeacherCorrection). */
const INLINE_LATIN_MARKER_RE = /(?:^|[.!?]\s*)(Say|Repeat)\s*:\s*/gi

/**
 * Inline Cyrillic markers: Unicode letter/number edge — `\b` is ASCII-only.
 * Mirrors teacherDrillCompleteness ERROR_REPEAT_MARKER_RE style.
 */
const INLINE_CYRILLIC_MARKER_RE = /(?:^|[^\p{L}\p{N}])(Скажи|Повтори)\s*:\s*/giu

function normalizeMarker(raw: string): EngvoRepeatCueMarker {
  const lower = raw.toLowerCase()
  if (lower === 'say') return 'Say'
  if (lower === 'repeat') return 'Repeat'
  if (lower === 'скажи') return 'Скажи'
  return 'Повтори'
}

function stripMarkdownBoldWrappers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').trim()
}

function firstSentence(body: string): string {
  const trimmed = stripWrappingQuotes(stripMarkdownBoldWrappers(body))
  const m = trimmed.match(/^[^.!?]+[.!?]?/)
  return (m ? m[0] : trimmed).trim()
}

function splitAtLineMarker(text: string): EngvoAssistantRepeatCue | null {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    if (!line) continue
    const cleaned = stripMarkdownBoldWrappers(line)
    const m = MARKER_START_RE.exec(cleaned)
    if (!m) continue

    let afterKeyword = (m[2] ?? '').trim()
    if (!afterKeyword || /^[:.]$/.test(afterKeyword)) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]!.trim()
        if (next) {
          afterKeyword = stripMarkdownBoldWrappers(next)
          break
        }
      }
    }

    const repeatText = firstSentence(afterKeyword)
    if (!repeatText || repeatText.length < 2 || /^[:\s.]*$/.test(repeatText)) return null

    const correction = lines
      .slice(0, i)
      .join('\n')
      .replace(/\s+$/u, '')
      .trim()

    return {
      correction,
      marker: normalizeMarker(m[1]!),
      repeatText,
    }
  }
  return null
}

type InlineHit = { index: number; matchLen: number; marker: EngvoRepeatCueMarker }

function findLastInlineHit(text: string): InlineHit | null {
  let best: InlineHit | null = null

  for (const re of [INLINE_LATIN_MARKER_RE, INLINE_CYRILLIC_MARKER_RE]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const markerRaw = m[1]!
      const full = m[0]
      // Prefer marker token start inside the match (after punctuation/edge).
      const markerOffset = full.toLowerCase().lastIndexOf(markerRaw.toLowerCase())
      const index = m.index + (markerOffset >= 0 ? markerOffset : 0)
      const matchLen = full.length - (markerOffset >= 0 ? markerOffset : 0)
      if (!best || index >= best.index) {
        best = { index, matchLen, marker: normalizeMarker(markerRaw) }
      }
    }
  }

  return best
}

function splitAtInlineMarker(text: string): EngvoAssistantRepeatCue | null {
  const cleaned = stripMarkdownBoldWrappers(text)
  const hit = findLastInlineHit(cleaned)
  if (!hit) return null

  const after = cleaned.slice(hit.index + hit.matchLen).trim()
  const repeatText = firstSentence(after)
  if (!repeatText || repeatText.length < 2 || /^[:\s.]*$/.test(repeatText)) return null

  const correction = cleaned.slice(0, hit.index).replace(/\s+$/u, '').trim()

  return {
    correction,
    marker: hit.marker,
    repeatText,
  }
}

/**
 * Split Engvo teacher ERROR transcript into correction + repeat cue for chat UI.
 * Does not mutate stored message content — parse-only.
 */
export function splitEngvoAssistantRepeatCue(text: string): EngvoAssistantRepeatCue | null {
  const raw = text.trim()
  if (!raw) return null

  return splitAtLineMarker(raw) ?? splitAtInlineMarker(raw)
}
