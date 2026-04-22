const TYPO_MAP: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  cta: 'cat',
  adn: 'and',
  titalk: 'to talk',
  gon: 'going',
}

const WORD_RE = /\b([A-Za-z]+)\b/g

function isLatinDominantText(text: string): boolean {
  const latCount = (text.match(/[A-Za-z]/g) ?? []).length
  const cyrCount = (text.match(/[А-Яа-яЁё]/g) ?? []).length
  return latCount > 0 && latCount >= cyrCount
}

function shouldSkipWord(word: string): boolean {
  if (word.length <= 2) return true
  if (/^[A-Z]{2,}$/.test(word)) return true
  return false
}

function preserveWordCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase()
  if (original[0] === original[0]?.toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}

export function applyTypoFixes(text: string): string {
  if (!text.trim() || !isLatinDominantText(text)) return text

  return text.replace(WORD_RE, (word) => {
    if (shouldSkipWord(word)) return word
    const replacement = TYPO_MAP[word.toLowerCase()]
    if (!replacement) return word
    return preserveWordCase(word, replacement)
  })
}

export function getTypoMapForTests(): Record<string, string> {
  return TYPO_MAP
}
