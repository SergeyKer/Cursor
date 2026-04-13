function isStandaloneTranslationIntroSentence(sentence: string): boolean {
  const normalized = sentence.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/g, '').trim()
  return /^(?:Теперь|А теперь|Следующее предложение|Далее|Переведи далее)$/i.test(normalized)
}

/**
 * Убирает обрамляющие кавычки у русского drill-предложения (модель часто пишет «…: "текст." .»).
 */
export function stripWrappingQuotesFromDrillRussianLine(input: string): string {
  let t = input.replace(/\s+/g, ' ').trim()
  if (!t) return t

  for (let i = 0; i < 3; i++) {
    const prev = t
    const guillemet = /^«(.+)»(?:\s*\.+)?\s*$/.exec(t)
    if (guillemet?.[1]) {
      t = guillemet[1].replace(/\s+/g, ' ').trim()
      continue
    }
    const ascii = /^"(.+)"(?:\s*\.+)?\s*$/.exec(t)
    if (ascii?.[1]) {
      t = ascii[1].replace(/\s+/g, ' ').trim()
      continue
    }
    const curly = /^[\u201C\u201E](.+)\u201D(?:\s*\.+)?\s*$/.exec(t)
    if (curly?.[1]) {
      t = curly[1].replace(/\s+/g, ' ').trim()
      continue
    }
    if (t.startsWith("'") && t.endsWith("'") && t.length > 2) {
      t = t.slice(1, -1).replace(/\s+/g, ' ').trim()
      continue
    }
    if (prev === t) break
  }

  return t.replace(/\.{2,}$/u, '.').trim()
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
    .replace(/(?:Переведи(?:те)?|Переведите)\s+на\s+английский[.:]/gi, ' ')
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
  const trimmed = stripWrappingQuotesFromDrillRussianLine(firstRu.trim())
  if (isTranslationNextRussianMetaInstruction(trimmed)) return null
  return trimmed || null
}
