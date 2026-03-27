const INTENTION_VERBS = ['plan', 'want', 'hope', 'try'] as const

type IntentionVerb = (typeof INTENTION_VERBS)[number]

interface IntentionSignature {
  verb: IntentionVerb
  infinitive: string | null
  objectToken: string | null
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  if (!normalized) return []
  return normalized.split(' ').filter(Boolean)
}

function findIntentionSignatures(tokens: string[]): IntentionSignature[] {
  const signatures: IntentionSignature[] = []
  for (let i = 0; i < tokens.length - 2; i++) {
    const maybeVerb = tokens[i]
    const maybeTo = tokens[i + 1]
    const maybeInfinitive = tokens[i + 2]
    if (!INTENTION_VERBS.includes(maybeVerb as IntentionVerb)) continue
    if (maybeTo !== 'to') continue
    signatures.push({
      verb: maybeVerb as IntentionVerb,
      infinitive: maybeInfinitive ?? null,
      objectToken: tokens[i + 3] ?? null,
    })
  }
  return signatures
}

export function hasIntentionInfinitive(text: string): boolean {
  return findIntentionSignatures(tokenize(text)).length > 0
}

/**
 * Guard against semantic downgrades like:
 * "I plan to find my work" -> "I find my work"
 */
export function isRepeatSemanticallySafe(params: {
  userText: string
  repeatSentence: string
}): boolean {
  const { userText, repeatSentence } = params
  const userTokens = tokenize(userText)
  const repeatTokens = tokenize(repeatSentence)
  const userIntention = findIntentionSignatures(userTokens)
  if (userIntention.length === 0) return true
  const repeatIntention = findIntentionSignatures(repeatTokens)
  if (repeatIntention.length === 0) return false

  for (const userSig of userIntention) {
    const sameVerb = repeatIntention.find((r) => r.verb === userSig.verb)
    if (!sameVerb) return false
    if (userSig.infinitive && sameVerb.infinitive && userSig.infinitive !== sameVerb.infinitive) {
      return false
    }
  }
  return true
}
