/**
 * Нормализация английских строк для сравнения «ответ пользователя» ↔ «Повтори».
 * Базовая нормализация + узкие склейки раздельно написанных слов (text book → textbook).
 */

export function normalizeEnglishSentenceForComparison(text: string): string {
  const nfc = typeof text.normalize === 'function' ? text.normalize('NFC') : text
  return nfc
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Пары «пробел внутри одного слова» → каноническая форма (после base normalize). */
const COMPOUND_SPACE_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\btext\s+book\b/g, 'textbook'],
  [/\bnote\s+book\b/g, 'notebook'],
  [/\bclass\s+room\b/g, 'classroom'],
  [/\bbed\s+room\b/g, 'bedroom'],
]

export function normalizeEnglishForRepeatMatch(text: string): string {
  let s = normalizeEnglishSentenceForComparison(text)
  for (const [re, replacement] of COMPOUND_SPACE_PATTERNS) {
    s = s.replace(re, replacement)
  }
  return s.replace(/\s+/g, ' ').trim()
}
