/**
 * Speak/translate should use English practice text only when the first
 * communication bubble starts with a Russian CEFR meta warning.
 */

export type CommunicationOpeningSplit = {
  ruWarn: string
  enInvite: string
}

/**
 * Split RU CEFR meta warn + EN invite when the first line is Cyrillic-only.
 * Returns null when there is no such split (pure EN, mixed first line, etc.).
 */
export function splitCommunicationOpening(content: string): CommunicationOpeningSplit | null {
  const text = (content ?? '').trim()
  if (!text) return null

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const first = lines[0] ?? ''
  const hasCyr = /[А-Яа-яЁё]/.test(first)
  const hasLatFirst = /[A-Za-z]/.test(first)
  // RU meta line(s) then EN invite: take from first Latin-leading line onward.
  if (hasCyr && !hasLatFirst) {
    const enStart = lines.findIndex((line) => /^[A-Za-z]/.test(line))
    if (enStart >= 0) {
      const ruWarn = lines.slice(0, enStart).join('\n').trim()
      const enInvite = lines.slice(enStart).join('\n').trim()
      if (ruWarn && enInvite) {
        return { ruWarn, enInvite }
      }
    }
  }

  return null
}

export function extractCommunicationSpeakText(content: string): string {
  const text = (content ?? '').trim()
  if (!text) return ''
  const split = splitCommunicationOpening(text)
  return split ? split.enInvite : text
}
