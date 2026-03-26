function stripLeadingTopicPrepositions(text: string): string {
  return text
    .replace(/^(?:about|on|at|in|to|for|with|of)\s+/i, '')
    .replace(/^(?:о|об|про)\s+/i, '')
    .trim()
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
  const stripped = stripLeadingTopicPrepositions(entity.replace(/\s+/g, ' ').trim())
  if (!stripped) return null

  if (topic === 'movies_series') {
    const mapped = mapMoviesSeriesEntity(stripped)
    if (mapped) return mapped
  }

  // В английские шаблоны вопроса не подставляем сырой кириллический хвост.
  if (/[А-Яа-яЁё]/.test(stripped)) return null
  return stripped
}
