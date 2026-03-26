function stripLeadingTopicPrepositions(text: string): string {
  return text
    .replace(/^(?:about|on|at|in|to|for|with|of)\s+/i, '')
    .replace(/^(?:о|об|про)\s+/i, '')
    .trim()
}

const LEADING_ANSWER_VERB_PATTERNS: RegExp[] = [
  /^(?:watched|played|liked|visited|used|worked|talked|met|studied|did|saw|seen|gone|went)\s+/i,
  /^(?:watching|playing|liking|visiting|using|working|talking|meeting|studying|eating)\s+/i,
  /^(?:listened\s+to|listening\s+to)\s+/i,
  /^(?:been\s+watching|been\s+playing|been\s+liking|been\s+visiting|been\s+using|been\s+working|been\s+talking|been\s+meeting|been\s+studying|been\s+listening\s+to|been\s+eating)\s+/i,
]

export function stripLeadingAnswerVerbPhrases(text: string): string {
  let value = text.replace(/\s+/g, ' ').trim()
  if (!value) return value

  let changed = true
  while (changed) {
    changed = false
    for (const pattern of LEADING_ANSWER_VERB_PATTERNS) {
      const next = value.replace(pattern, '').trim()
      if (next !== value) {
        value = next
        changed = true
      }
    }
  }

  return value
}

function stripMoviesSeriesLeadIns(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const m = /^(?:the\s+)?(?:movie|movies|film|films|show|shows|series|tv\s+show|tv\s+series)\s+(.+)$/i.exec(normalized)
  if (!m?.[1]) return normalized

  const tail = m[1].trim()
  if (!tail) return normalized

  const genreLike = /^(?:horror|comed(?:y|ies)|thriller|drama|action|romance|sci[-\s]?fi|fantasy|documentary|animation|anime)\b/i.test(tail)
  if (genreLike) return normalized

  return tail
}

function mapMoviesSeriesEntity(raw: string): string | null {
  const lower = raw.toLowerCase()

  if (/\b(horror|horrors)\b/i.test(raw) || /ужас/.test(lower) || /хоррор/.test(lower)) {
    return 'horror movies'
  }
  if (/\b(comedy|comedies)\b/i.test(raw) || /комеди/.test(lower)) {
    return 'comedies'
  }
  if (/\b(movie|movies|film|films|cinema)\b/i.test(raw) || /фильм|кино|мульт/.test(lower)) {
    return raw
  }

  return null
}

export function normalizeDialogueEntityForTopic(entity: string, topic: string): string | null {
  const stripped = stripLeadingTopicPrepositions(stripLeadingAnswerVerbPhrases(entity))
  if (!stripped) return null

  if (topic === 'movies_series') {
    const moviesSeriesStripped = stripMoviesSeriesLeadIns(stripped)
    const mapped = mapMoviesSeriesEntity(moviesSeriesStripped)
    if (mapped) return mapped
    if (/[А-Яа-яЁё]/.test(moviesSeriesStripped)) return null
    return moviesSeriesStripped
  }

  // В английские шаблоны вопроса не подставляем сырой кириллический хвост.
  if (/[А-Яа-яЁё]/.test(stripped)) return null
  return stripped
}
