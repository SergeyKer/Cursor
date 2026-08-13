const CHEAP_LATIN = new Set([
  'ok',
  'okay',
  'yes',
  'no',
  'hi',
  'hey',
  'lol',
  'yeah',
  'yup',
  'nah',
  'the',
  'and',
  'for',
  'you',
  'a',
  'an',
  'to',
  'of',
  'in',
  'on',
  'is',
  'it',
])

const MIX_SEED = new Set(['i', "i'm", 'im', 'we', "we're", 'were'])

function latinTokens(text: string): string[] {
  return (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).map((t) => t.toLowerCase())
}

/**
 * XP-eligible English attempt in communication: mix with I/we, or a non-filler Latin word.
 * Looks at the learner message only.
 */
export function hasCommunicationEnglishAttempt(userText: string): boolean {
  const t = (userText ?? '').trim()
  if (!t) return false

  const tokens = latinTokens(t)
  if (tokens.length === 0) return false

  const hasCyr = /[А-Яа-яЁё]/.test(t)
  if (hasCyr && tokens.some((tok) => MIX_SEED.has(tok))) return true

  return tokens.some((tok) => tok.length >= 3 && !CHEAP_LATIN.has(tok))
}
