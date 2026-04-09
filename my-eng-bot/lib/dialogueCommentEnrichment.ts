import { getDialogueRepeatSentence } from './dialogueTenseInference'

/** Вспомогательные слова — не считаем «опечаткой» смену на другое слово из Повтори. */
const AUX_EN = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'as', 'by',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'not', "n't", 'yes', 'no', 'ok', 'yeah', 'yep', 'nope', 'oh', 'well', 'so', 'very', 'too',
])

function tokenizeEnglishWords(text: string): string[] {
  return (text.match(/\b[a-z']+\b/gi) ?? []).map((t) => t)
}

/** Без \\b: в JS границы слова не считают кириллицу частью \\w. */
function tokenizeMixedWords(text: string): string[] {
  return (text.match(/[A-Za-zА-Яа-яЁё'-]+/g) ?? []).map((t) => t)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = al[i - 1] === bl[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      )
    }
  }
  return dp[m]![n]!
}

function maxEditDistanceForPair(u: string, r: string): number {
  const L = Math.max(u.length, r.length)
  if (L <= 4) return 1
  if (L <= 7) return 2
  return 2
}

function collectTypoPairs(userText: string, repeatText: string): { wrong: string; right: string }[] {
  const userToks = tokenizeEnglishWords(userText)
  const repToks = tokenizeEnglishWords(repeatText)
  const repLower = repToks.map((t) => t.toLowerCase())
  const usedRep = new Set<number>()
  const pairs: { wrong: string; right: string }[] = []

  for (let i = 0; i < userToks.length; i++) {
    const raw = userToks[i] ?? ''
    const u = raw.toLowerCase()
    if (u.length < 3 || AUX_EN.has(u)) continue
    if (repLower.some((r) => r === u)) continue

    let bestJ = -1
    let bestD = 999
    for (let j = 0; j < repToks.length; j++) {
      if (usedRep.has(j)) continue
      const r = repToks[j] ?? ''
      const rl = r.toLowerCase()
      if (AUX_EN.has(rl)) continue
      const d = levenshtein(u, rl)
      if (d === 0) continue
      const maxD = maxEditDistanceForPair(u, rl)
      if (d > maxD) continue
      if (d < bestD) {
        bestD = d
        bestJ = j
      }
    }

    if (bestJ >= 0 && bestD <= maxEditDistanceForPair(u, (repToks[bestJ] ?? '').toLowerCase())) {
      usedRep.add(bestJ)
      const right = repToks[bestJ] ?? ''
      pairs.push({ wrong: raw, right })
    }
  }

  const seen = new Set<string>()
  return pairs.filter((p) => {
    const key = `${p.wrong.toLowerCase()}|${p.right.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function commentAlreadyMentionsSpelling(commentBody: string): boolean {
  return /опечат|орфограф|написан|написание\s+слов|букв/i.test(commentBody)
}

function commentAlreadyMentionsWord(commentBody: string, wrong: string, right: string): boolean {
  const low = commentBody.toLowerCase()
  const w = wrong.toLowerCase()
  const r = right.toLowerCase()
  if (low.includes(w) && low.includes(r)) return true
  return false
}

function collectPossessiveYourHints(
  userText: string,
  repeatText: string,
  commentBody: string
): string[] {
  if (/притяжательн/i.test(commentBody) && /\byour\b/i.test(commentBody) && /\byou\b/i.test(commentBody)) {
    return []
  }
  const uTok = tokenizeMixedWords(userText)
  const rTok = tokenizeMixedWords(repeatText)
  const max = Math.min(uTok.length, rTok.length)
  for (let i = 0; i < max; i++) {
    const ul = (uTok[i] ?? '').toLowerCase()
    const rl = (rTok[i] ?? '').toLowerCase()
    if (rl === 'your' && ul === 'you') {
      return ['Нужно притяжательное your, а не you.']
    }
  }
  return []
}

function collectCyrillicVsEnglishHints(
  userText: string,
  repeatText: string,
  commentBody: string
): string[] {
  if (/русск(?:ое|ого|ий|ая)?\s+«/i.test(commentBody) || /замени\s+на\s+английск/i.test(commentBody)) {
    return []
  }
  const uTok = tokenizeMixedWords(userText)
  const rTok = tokenizeEnglishWords(repeatText)
  const hints: string[] = []
  const max = Math.min(uTok.length, rTok.length)
  for (let i = 0; i < max; i++) {
    const uw = uTok[i] ?? ''
    const rw = rTok[i] ?? ''
    if (uw.length <= 1 || rw.length <= 1) continue
    if (!/[а-яё]/i.test(uw)) continue
    if (!/^[a-z]+$/i.test(rw)) continue
    if (commentBody.includes(uw) && commentBody.includes(rw)) continue
    hints.push(`Русское «${uw}» замени на английское «${rw}».`)
  }
  return hints
}

/**
 * Дополняет строку «Комментарий» перечислением опечаток, если «Повтори» исправляет слова из ответа пользователя,
 * а модель не упомянула это в комментарии.
 */
export function enrichDialogueCommentWithTypoHints(params: {
  content: string
  userText: string
}): string {
  const { content, userText } = params
  const trimmed = content.trim()
  if (!trimmed || !userText.trim()) return content

  const repeatSentence = getDialogueRepeatSentence(trimmed)
  if (!repeatSentence) return content

  const lines = trimmed.split(/\r?\n/)
  const commentIdx = lines.findIndex((l) => /^\s*Комментарий\s*:/i.test(l.trim()))
  if (commentIdx < 0) return content

  const commentLine = lines[commentIdx] ?? ''
  const commentBody = commentLine.replace(/^\s*Комментарий\s*:\s*/i, '').trim()
  if (!commentBody) return content

  const hints: string[] = []

  if (!commentAlreadyMentionsSpelling(commentBody)) {
    const pairs = collectTypoPairs(userText, repeatSentence).slice(0, 5)
    const extra = pairs.filter((p) => !commentAlreadyMentionsWord(commentBody, p.wrong, p.right))
    if (extra.length === 1) {
      hints.push(`Также опечатка: «${extra[0]!.wrong}» → «${extra[0]!.right}».`)
    } else if (extra.length > 1) {
      hints.push(`Также опечатки: ${extra.map((p) => `«${p.wrong}» → «${p.right}»`).join(', ')}.`)
    }
  }

  hints.push(...collectPossessiveYourHints(userText, repeatSentence, commentBody))
  hints.push(...collectCyrillicVsEnglishHints(userText, repeatSentence, commentBody))

  if (!hints.length) return content

  lines[commentIdx] = `Комментарий: ${commentBody} ${hints.join(' ')}`.replace(/\s+/g, ' ').trim()
  return lines.join('\n').trim()
}
