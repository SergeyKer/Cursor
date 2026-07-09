export type HighlightSegment = {
  text: string
  bold: boolean
}

/** Split `text` into segments, bolding first occurrences of each highlight substring. */
export function highlightCorrected(text: string, highlights: string[]): HighlightSegment[] {
  if (!text) return []
  const cleaned = highlights
    .map((h) => h.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  if (cleaned.length === 0) return [{ text, bold: false }]

  type Mark = { start: number; end: number }
  const marks: Mark[] = []

  for (const h of cleaned) {
    let from = 0
    while (from < text.length) {
      const idx = text.indexOf(h, from)
      if (idx < 0) break
      const end = idx + h.length
      const overlaps = marks.some((m) => idx < m.end && end > m.start)
      if (!overlaps) {
        marks.push({ start: idx, end })
        break
      }
      from = idx + 1
    }
  }

  marks.sort((a, b) => a.start - b.start)

  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const mark of marks) {
    if (mark.start > cursor) {
      segments.push({ text: text.slice(cursor, mark.start), bold: false })
    }
    segments.push({ text: text.slice(mark.start, mark.end), bold: true })
    cursor = mark.end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), bold: false })
  }
  return segments.length ? segments : [{ text, bold: false }]
}
