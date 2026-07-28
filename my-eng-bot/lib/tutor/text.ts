/** Shared string helpers for tutor chat normalize (no zod). */

export function compactText(value: unknown, maxLength = 280): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength).trim()
}

export function compactParagraph(value: unknown, maxLength = 600): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, maxLength).trim()
}

export function compactList(value: unknown, maxItems: number, maxLength = 280): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const text = compactText(item, maxLength)
    if (!text) continue
    out.push(text)
    if (out.length >= maxItems) break
  }
  return out
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}
