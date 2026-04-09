function isStandaloneTranslationIntroSentence(sentence: string): boolean {
  const normalized = sentence.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/g, '').trim()
  return /^(?:Теперь|А теперь|Следующее предложение|Далее|Переведи далее)$/i.test(normalized)
}

export function extractSingleTranslationNextSentence(lines: string[]): string | null {
  let raw = lines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/(?:Переведи(?:те)?|Переведите)\s+на\s+английский\./gi, ' ')
    .replace(/(?:Переведи(?:те)?|Переведите)(?:\s+далее)?\s*:\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  raw = raw.replace(/^(?:А\s+)?(?:теперь|давайте|попробуем)\s+(?:скажите|переведите|попробуйте|сформулируйте|переведем)[^:]*:\s*/gi, '')
  raw = raw.replace(/^(?:Теперь|А теперь|Следующее предложение|Далее|Переведи далее)[^:]*:\s*/gi, '')

  if (!raw) return null
  const sentenceCandidates = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const filteredCandidates = sentenceCandidates.filter((s) => !isStandaloneTranslationIntroSentence(s))
  const firstRu = filteredCandidates.find((s) => /[А-Яа-яЁё]/.test(s))
  if (!firstRu) return null
  return firstRu.trim() || null
}
