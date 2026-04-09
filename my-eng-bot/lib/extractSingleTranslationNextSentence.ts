function isStandaloneTranslationIntroSentence(sentence: string): boolean {
  const normalized = sentence.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/g, '').trim()
  return /^(?:Теперь|А теперь|Следующее предложение|Далее|Переведи далее)$/i.test(normalized)
}

/** «Конец слова» для кириллицы: \\b в JS не считает буквы а-я словесными. */
const RU_AFTER_WORD = '(?=\\s|$|[.,!?;:…])'

/**
 * Рамка тьютора («давай поговорим…»), а не готовое предложение для перевода в SUCCESS.
 */
export function isTranslationNextRussianMetaInstruction(s: string): boolean {
  const t = s.replace(/\s+/g, ' ').trim()
  if (!t || !/[А-Яа-яЁё]/.test(t)) return false
  const lower = t.toLowerCase()
  if (new RegExp(`^(?:теперь\\s+)?давай(те)?\\s+поговорим${RU_AFTER_WORD}`, 'i').test(t)) return true
  if (
    new RegExp(`^давай(те)?\\s+(?:поговорим|поговорить|обсудим|обсудить)${RU_AFTER_WORD}`, 'i').test(t)
  ) {
    return true
  }
  if (new RegExp(`^(?:а\\s+)?теперь\\s+(?:давай(те)?\\s+)?(?:поговорим|обсудим)${RU_AFTER_WORD}`, 'i').test(t)) {
    return true
  }
  if (new RegExp(`^сейчас\\s+мы${RU_AFTER_WORD}`, 'i').test(t)) return true
  if (
    new RegExp(`^попробуй(те)?\\s+(?:переведи|перевести|скажи|напиши)${RU_AFTER_WORD}`, 'i').test(t)
  ) {
    return true
  }
  if (new RegExp(`^теперь\\s+скажи(те)?${RU_AFTER_WORD}`, 'i').test(t)) return true
  if (new RegExp(`^переведи\\s+следующее${RU_AFTER_WORD}`).test(lower)) return true
  if (new RegExp(`^а\\s+теперь\\s+переведи${RU_AFTER_WORD}`, 'i').test(lower)) return true
  return false
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
  const trimmed = firstRu.trim()
  if (isTranslationNextRussianMetaInstruction(trimmed)) return null
  return trimmed || null
}
