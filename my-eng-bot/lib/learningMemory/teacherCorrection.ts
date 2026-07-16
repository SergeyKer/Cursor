/** Inline extract of teacher voice correction markers (one-line transcripts). */

export function extractTeacherCorrection(text: string): {
  corrected: string | null
  marker: 'you_meant' | 'skazhi' | 'say' | null
} {
  const raw = text.replace(/\s+/g, ' ').trim()
  if (!raw) return { corrected: null, marker: null }

  const youMeant =
    /you\s*mean(?:t)?\s*:\s*["“]?([^"”]+?)["”]?(?=\s*(?:\.|!|\?|can you say|please say|now translate|translate|переведи|скажи|$))/i.exec(
      raw
    )
  if (youMeant?.[1]?.trim()) {
    return { corrected: youMeant[1].trim().replace(/^["“]|["”]$/g, ''), marker: 'you_meant' }
  }

  const skazhi =
    /скажи\s*:\s*([^.!?]+(?:[.!?])?)/i.exec(raw)
  if (skazhi?.[1]?.trim()) {
    const corrected = skazhi[1]
      .trim()
      .replace(/\s*(?:переведи|translate).*$/i, '')
      .trim()
    if (corrected) return { corrected, marker: 'skazhi' }
  }

  const say =
    /(?:^|[.!?]\s*)say\s*:\s*([^.!?]+(?:[.!?])?)/i.exec(raw)
  if (say?.[1]?.trim()) {
    const corrected = say[1]
      .trim()
      .replace(/\s*(?:переведи|translate).*$/i, '')
      .trim()
    if (corrected) return { corrected, marker: 'say' }
  }

  return { corrected: null, marker: null }
}
