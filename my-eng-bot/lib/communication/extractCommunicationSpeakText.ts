/**
 * Speak/translate should use English practice text only when the first
 * communication bubble starts with a Russian CEFR meta warning.
 */
export function extractCommunicationSpeakText(content: string): string {
  const text = (content ?? '').trim()
  if (!text) return ''

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return ''

  const first = lines[0] ?? ''
  const hasCyr = /[А-Яа-яЁё]/.test(first)
  const hasLatFirst = /[A-Za-z]/.test(first)
  // RU meta line(s) then EN invite: take from first Latin-leading line onward.
  if (hasCyr && !hasLatFirst) {
    const enStart = lines.findIndex((line) => /^[A-Za-z]/.test(line))
    if (enStart >= 0) {
      return lines.slice(enStart).join('\n').trim()
    }
  }

  return text
}
