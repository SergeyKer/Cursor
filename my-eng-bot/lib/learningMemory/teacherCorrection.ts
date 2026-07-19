/** Inline extract of teacher voice correction markers (one-line transcripts). */

export type TeacherCorrectionMarker = 'you_meant' | 'skazhi' | 'say' | 'contrast' | null

export function extractTeacherCorrection(text: string): {
  corrected: string | null
  marker: TeacherCorrectionMarker
} {
  const raw = text.replace(/\s+/g, ' ').trim()
  if (!raw) return { corrected: null, marker: null }

  // Legacy first (A1/A2 + transitional B1+): keep 39989bf fixtures stable.
  const youMeant =
    /you\s*mean(?:t)?\s*:\s*["“]?([^"”]+?)["”]?(?=\s*(?:\.|!|\?|can you say|please say|now translate|translate|переведи|скажи|$))/i.exec(
      raw
    )
  if (youMeant?.[1]?.trim()) {
    return { corrected: cleanCorrected(youMeant[1]), marker: 'you_meant' }
  }

  const skazhi = /скажи\s*:\s*([^.!?]+(?:[.!?])?)/i.exec(raw)
  if (skazhi?.[1]?.trim()) {
    const corrected = skazhi[1]
      .trim()
      .replace(/\s*(?:переведи|translate).*$/i, '')
      .trim()
    if (corrected) return { corrected: cleanCorrected(corrected), marker: 'skazhi' }
  }

  const say = /(?:^|[.!?]\s*)say\s*:\s*([^.!?]+(?:[.!?])?)/i.exec(raw)
  if (say?.[1]?.trim()) {
    const corrected = say[1]
      .trim()
      .replace(/\s*(?:переведи|translate).*$/i, '')
      .trim()
    if (corrected) return { corrected: cleanCorrected(corrected), marker: 'say' }
  }

  const enContrast =
    /\bso:\s*["“]?([^"“”]+?)["”]?\s*[—–\-]+\s*not(?:\s+just)?\s*:?/i.exec(raw)
  if (enContrast?.[1]?.trim()) {
    return { corrected: cleanCorrected(enContrast[1]), marker: 'contrast' }
  }

  const ruContrast =
    /(?:^|[^\p{L}\p{N}])так:\s*["“]?([^"“”]+?)["”]?\s*[—–\-]+\s*не\s*так\s*:?/iu.exec(raw)
  if (ruContrast?.[1]?.trim()) {
    return { corrected: cleanCorrected(ruContrast[1]), marker: 'contrast' }
  }

  return { corrected: null, marker: null }
}

function cleanCorrected(value: string): string {
  return value
    .trim()
    .replace(/^["“]|["”]$/g, '')
    .replace(/[.!?]+$/g, '')
    .trim()
}
