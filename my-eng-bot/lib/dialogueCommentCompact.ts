/**
 * Сжимает «Комментарий:» в диалоге до короткого вида, но не отбрасывает
 * явные дополнения про опечатки/лексику/смешанный ввод (см. isExplicitExtraIssueSentence).
 */

function normalizeSentenceKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:()"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isExplicitExtraIssueSentence(s: string): boolean {
  const t = s.trim()
  return (
    /^Также\s+опечат/i.test(t) ||
    /^(?:Орфографическая|Лексическая)\s+ошибка\b/i.test(t) ||
    (/притяжательн/i.test(t) && /\byour\b/i.test(t) && /\byou\b/i.test(t)) ||
    /русск(?:ое|ого|ий|ая|ом)?\s+«/i.test(t) ||
    /замени\s+на\s+английск/i.test(t) ||
    /^Нужно\s+притяжательн/i.test(t)
  )
}

const MAX_COMPACT_SENTENCES = 4

export function compactDialogueComment(content: string, _audience: 'child' | 'adult'): string {
  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex < 0) return content
  const raw = lines[commentIndex] ?? ''
  const body = raw.replace(/^Комментарий\s*:\s*/i, '').trim()
  if (!body) return content

  const sentenceCandidates = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const uniqueSentences: string[] = []
  for (const sentence of sentenceCandidates) {
    const key = normalizeSentenceKey(sentence)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    uniqueSentences.push(sentence)
  }

  const hasTenseReason = (s: string) =>
    /\b(результат|опыт|привычк|регулярн|прямо сейчас|в прошлом|в будущем|время из вопроса)\b/i.test(s)

  const prioritized: string[] = []
  if (uniqueSentences.length > 0) prioritized.push(uniqueSentences[0]!)
  const important = uniqueSentences.find((s, idx) => idx > 0 && hasTenseReason(s))
  if (important && !prioritized.includes(important)) prioritized.push(important)
  for (const sentence of uniqueSentences) {
    if (!prioritized.includes(sentence)) prioritized.push(sentence)
  }

  const baseMax = 2
  const selected: string[] = [...prioritized.slice(0, baseMax)]
  const rest = prioritized.slice(baseMax)
  for (const s of rest) {
    if (!isExplicitExtraIssueSentence(s)) continue
    if (selected.includes(s)) continue
    if (selected.length >= MAX_COMPACT_SENTENCES) break
    selected.push(s)
  }

  const compact = selected.join(' ').trim()
  if (!compact) return content
  lines[commentIndex] = `Комментарий: ${compact}`
  return lines.join('\n').trim()
}
