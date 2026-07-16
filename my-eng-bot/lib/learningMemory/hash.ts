/** Stable short hash for utterance dedupe (not cryptographic). */
export function hashUtterance(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
  let h = 2166136261
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
