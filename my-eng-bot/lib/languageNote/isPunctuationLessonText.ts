/**
 * Detects STT/dictation "lessons" about punctuation or capitalization.
 * Used to hide such feedback from Language Note reasons/topics and Dialog comments.
 * Unicode-safe: JS `\w` does NOT match Cyrillic — use `\p{L}`.
 */

/** Comma / Oxford-comma lessons — not learner mistakes. Avoids «запятнать». */
export function isCommaJunkText(text: string): boolean {
  if (/запят(?!н)/i.test(text)) return true
  if (/\bcommas?\b|oxford\s+comma/i.test(text)) return true
  return false
}

/** True if text teaches punctuation or capitalization (voice dictation noise). */
export function isPunctuationOrCapitalizationLessonText(text: string): boolean {
  const t = text.trim()
  if (!t) return false

  // EN period / marks (avoid bare `\bperiods?\b` — false hits on "period of time")
  if (/\bperiod after\b/i.test(t)) return true
  if (/\bquestion mark/i.test(t)) return true
  if (/\bexclamation mark/i.test(t)) return true
  if (/\badded a period\b/i.test(t)) return true
  if (/\badded question mark/i.test(t)) return true
  if (/\bfor clear separation\b/i.test(t)) return true
  if (/\bfull\s+stop\b/i.test(t)) return true

  // EN capitalization
  if (/\bcapital\s+letter/i.test(t)) return true
  if (/\bshould\s+be\s+capitalized/i.test(t)) return true
  if (/\bstart(?:s|ing)?\s+with\s+a\s+capital/i.test(t)) return true
  if (/\bcapitalization\b/i.test(t)) return true

  // RU punctuation
  if (/знак(а|ов)?\s+препинания/iu.test(t)) return true
  if (/пунктуац/iu.test(t)) return true
  if (/добав\p{L}*\s+точк/iu.test(t)) return true
  if (/добав\p{L}*\s+вопросительн/iu.test(t)) return true
  if (/восклицательн/iu.test(t)) return true
  if (/(поставь|нужна|нужен|ставьте|ставь)\s+точк/iu.test(t)) return true
  if (/точк[уеаи]\s+(после|в\s+конце|перед)/iu.test(t)) return true

  // RU capitalization
  if (/заглавн/iu.test(t)) return true
  if (/с\s+большой\s+букв/iu.test(t)) return true
  if (/с\s+заглавной/iu.test(t)) return true

  // Commas (EN + RU, without «запятнать»)
  if (isCommaJunkText(t)) return true

  // Topic-style short labels
  if (/\bpunctuation\b/i.test(t)) return true
  if (/^знаки$/iu.test(t)) return true
  if (/\bperiod\b/i.test(t) && /(конц|конец|после|before|after|missing|нужн|добав)/iu.test(t)) {
    return true
  }

  return false
}
