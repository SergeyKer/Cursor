import type {
  AccentAttemptInput,
  AccentBlockFeedback,
  AccentMinimalPair,
  AccentPairMatch,
  AccentProgressiveMatch,
  AccentSubstitutionPattern,
  AccentWordMatch,
} from '@/types/accent'

const WORD_BOUNDARY = /\s+/

export function normalizeAccentText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeAccentText(value: string): string[] {
  const normalized = normalizeAccentText(value)
  return normalized ? normalized.split(WORD_BOUNDARY) : []
}

export function levenshteinDistance(a: string, b: string): number {
  const left = normalizeAccentText(a)
  const right = normalizeAccentText(b)
  if (left === right) return 0
  if (!left) return right.length
  if (!right) return left.length

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = new Array<number>(right.length + 1)

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
    }
    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j]
    }
  }

  return previous[right.length]
}

function fuzzyLimit(word: string): number {
  return normalizeAccentText(word).length <= 6 ? 1 : 2
}

function phrasePresent(normalizedTranscript: string, phrase: string): boolean {
  const normalizedPhrase = normalizeAccentText(phrase)
  if (!normalizedPhrase) return false
  return ` ${normalizedTranscript} `.includes(` ${normalizedPhrase} `)
}

function findFuzzyWord(expected: string, tokens: string[]): string | undefined {
  const normalizedExpected = normalizeAccentText(expected)
  const limit = fuzzyLimit(normalizedExpected)
  return tokens.find((token) => levenshteinDistance(normalizedExpected, token) <= limit)
}

function findSubstitution(expected: string, normalizedTranscript: string, patterns: AccentSubstitutionPattern[]) {
  const normalizedExpected = normalizeAccentText(expected)
  for (const pattern of patterns) {
    const alternatives = pattern.examples[normalizedExpected] ?? []
    const heard = alternatives.find((candidate) => phrasePresent(normalizedTranscript, candidate))
    if (heard) {
      return { pattern, heard }
    }
  }
  return null
}

function scoreFromRecognized(recognized: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((recognized / total) * 100)
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Очень ровно.'
  if (score >= 75) return 'Хорошая база, осталось закрепить.'
  if (score >= 55) return 'Уже есть опора, тренируем проблемные слова.'
  return 'Начинаем спокойно: сейчас важна ясность, не скорость.'
}

function analyzeWords(input: AccentAttemptInput): AccentBlockFeedback {
  const expectedWords = input.expectedWords ?? []
  const normalizedTranscript = normalizeAccentText(input.transcript)
  const tokens = tokenizeAccentText(input.transcript)

  const wordMatches: AccentWordMatch[] = expectedWords.map((expected) => {
    if (phrasePresent(normalizedTranscript, expected)) {
      return { expected, heard: expected, status: 'recognized' }
    }

    const substitution = findSubstitution(expected, normalizedTranscript, input.knownSubstitutions)
    if (substitution) {
      return {
        expected,
        heard: substitution.heard,
        status: 'substitution',
        patternId: substitution.pattern.id,
      }
    }

    const fuzzy = findFuzzyWord(expected, tokens)
    if (fuzzy) {
      return { expected, heard: fuzzy, status: 'fuzzy' }
    }

    return { expected, status: 'missing' }
  })

  const recognized = wordMatches.filter((match) => match.status === 'recognized' || match.status === 'fuzzy').length
  const score = scoreFromRecognized(recognized, expectedWords.length)
  const problemWords = wordMatches.filter((match) => match.status === 'missing' || match.status === 'substitution').map((match) => match.expected)
  const substitutionHint = wordMatches
    .map((match) => input.knownSubstitutions.find((pattern) => pattern.id === match.patternId)?.hint)
    .find(Boolean)

  return {
    lessonId: input.lessonId,
    blockType: 'words',
    score,
    summary: `Распознано ${recognized}/${expectedWords.length}. ${scoreLabel(score)}`,
    coachMessage: substitutionHint ?? (problemWords.length > 0 ? `Повтори медленнее: ${problemWords.slice(0, 4).join(', ')}.` : 'Отличная серия. Теперь закрепи тем же темпом.'),
    wordMatches,
    problemWords,
  }
}

function analyzePairs(input: AccentAttemptInput): AccentBlockFeedback {
  const pairs = input.expectedPairs ?? []
  const normalizedTranscript = normalizeAccentText(input.transcript)
  const matches: AccentPairMatch[] = pairs.map((item: AccentMinimalPair) => {
    const hasTarget = phrasePresent(normalizedTranscript, item.target)
    const hasContrast = phrasePresent(normalizedTranscript, item.contrast)
    if (hasTarget && hasContrast) {
      return { ...item, status: 'recognized', hint: 'Контраст слышится как две разные единицы.' }
    }
    if (hasTarget && !hasContrast) {
      return { ...item, status: 'missing_contrast', hint: `Добавь контрастное слово ${item.contrast} после короткой паузы.` }
    }
    if (!hasTarget && hasContrast) {
      return { ...item, status: 'missing_target', hint: `Верни целевой звук в слове ${item.target}.` }
    }
    const targetLikeContrast = findFuzzyWord(item.target, tokenizeAccentText(item.contrast))
    return {
      ...item,
      status: targetLikeContrast ? 'same_word' : 'merged',
      hint: `Скажи пару отдельно: ${item.target} - ${item.contrast}. Нужна микропаузa между словами.`,
    }
  })
  const recognized = matches.filter((match) => match.status === 'recognized').length
  const score = scoreFromRecognized(recognized, pairs.length)
  const problemWords = matches
    .filter((match) => match.status !== 'recognized')
    .flatMap((match) => [match.target, match.contrast])

  return {
    lessonId: input.lessonId,
    blockType: 'pairs',
    score,
    summary: `Контрастов распознано ${recognized}/${pairs.length}. ${scoreLabel(score)}`,
    coachMessage: problemWords.length > 0 ? matches.find((match) => match.status !== 'recognized')?.hint ?? 'Дай словам чуть больше воздуха между собой.' : 'Пары держатся раздельно. Это хороший знак для живой речи.',
    pairMatches: matches,
    problemWords,
  }
}

function analyzeProgressive(input: AccentAttemptInput): AccentBlockFeedback {
  const lines = input.progressiveLines ?? []
  const normalizedTranscript = normalizeAccentText(input.transcript)
  let firstBrokenIndex = -1
  const matches: AccentProgressiveMatch[] = lines.map((line, index) => {
    const recognized = phrasePresent(normalizedTranscript, line)
    if (!recognized && firstBrokenIndex === -1) firstBrokenIndex = index
    return {
      line,
      lineNumber: index + 1,
      status: recognized ? 'recognized' : 'broken',
    }
  })
  const recognized = matches.filter((match) => match.status === 'recognized').length
  const score = scoreFromRecognized(recognized, lines.length)
  const failureLine = firstBrokenIndex >= 0 ? lines[firstBrokenIndex] : null

  return {
    lessonId: input.lessonId,
    blockType: 'progressive',
    score,
    summary: `Цепочка удержана ${recognized}/${lines.length}. ${scoreLabel(score)}`,
    coachMessage: failureLine
      ? `Срыв начинается здесь: "${failureLine}". Повтори эту строку отдельно и только потом всю цепочку.`
      : 'Цепочка держится целиком. Можно переходить к следующему блоку.',
    progressiveMatches: matches,
    problemWords: failureLine ? tokenizeAccentText(failureLine) : [],
  }
}

export function analyzeAccentAttempt(input: AccentAttemptInput): AccentBlockFeedback {
  if (input.blockType === 'words') return analyzeWords(input)
  if (input.blockType === 'pairs') return analyzePairs(input)
  return analyzeProgressive(input)
}
