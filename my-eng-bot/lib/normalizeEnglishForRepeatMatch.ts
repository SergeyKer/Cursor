/**
 * Нормализация английских строк для сравнения «ответ пользователя» ↔ «Повтори».
 * Базовая нормализация + узкие склейки раздельно написанных слов (text book → textbook).
 */

/**
 * Кириллица (и полноширинные латинские), визуально совпадающие с ASCII-латиницей —
 * типичный ввод с RU-раскладки/автозамены; без подмены сравнение даёт ложные «лексические» ошибки.
 */
export function foldLatinHomoglyphsForEnglishMatch(text: string): string {
  if (!text) return text
  let s = text.replace(/[\u200B-\u200D\uFEFF]/g, '')
  const cyrillicLatin: Readonly<Record<string, string>> = {
    '\u0430': 'a',
    '\u0410': 'A',
    '\u0435': 'e',
    '\u0415': 'E',
    '\u043E': 'o',
    '\u041E': 'O',
    '\u0440': 'p',
    '\u0420': 'P',
    '\u0441': 'c',
    '\u0421': 'C',
    '\u0443': 'y',
    '\u0423': 'Y',
    '\u0445': 'x',
    '\u0425': 'X',
    '\u0456': 'i',
    '\u0406': 'I',
  }
  s = s.replace(/[\s\S]/gu, (ch) => cyrillicLatin[ch] ?? ch)
  s = s.replace(/[\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
  s = s.replace(/[\uFF21-\uFF3A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
  return s
}

export function normalizeEnglishSentenceForComparison(text: string): string {
  const nfc = typeof text.normalize === 'function' ? text.normalize('NFC') : text
  const folded = foldLatinHomoglyphsForEnglishMatch(nfc)
  return folded
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
