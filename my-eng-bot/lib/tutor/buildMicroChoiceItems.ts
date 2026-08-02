import type { TutorAnswerKind, TutorExplainAnswer, TutorMicroItem } from '@/lib/tutor/types'

const AGE_BE_RE =
  /\b(I|You|He|She|We|They)\s+(am|is|are)\s+(\d+)\s+years\s+old\b/i

const TENSE_LABEL_RE = /perfect|past\s*simple|continuous|progressive|present\s*simple|going\s*to/i

const DRILLABLE_KINDS: ReadonlySet<TutorAnswerKind> = new Set([
  'grammar',
  'form',
  'contrast',
])

export type AgeBeMatch = {
  subject: string
  be: string
  age: string
  correct: string
}

/** Parse «I am 20 years old» (with optional trailing punctuation). */
export function matchAgeBeExample(exampleEn: string): AgeBeMatch | null {
  const m = exampleEn.trim().match(AGE_BE_RE)
  if (!m) return null
  const subject = m[1]!
  const be = m[2]!
  const age = m[3]!
  return {
    subject,
    be,
    age,
    correct: `${subject} ${be} ${age} years old`,
  }
}

/**
 * Deterministic Russian-calque wrong form for age.
 * 3rd person keeps «have» (intentional L1 transfer), not «has».
 */
export function ageBeWrongForm(match: AgeBeMatch): string {
  return `${match.subject} have ${match.age} years`
}

function isTenseLabel(side: string): boolean {
  return TENSE_LABEL_RE.test(side)
}

function wordCount(side: string): number {
  return side
    .replace(/[.…]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

/** Full sentence / age phrase — not modal stubs like «will» / «going to». */
export function isPhraseContrastSide(side: string): boolean {
  const t = side.trim()
  if (!t || /[…]/.test(t) || /\.{3}/.test(t)) return false
  if (isTenseLabel(t)) return false
  if (/\byears?\b/i.test(t)) return true
  return wordCount(t) >= 3
}

export function isPhraseContrastPair(pair: [string, string]): boolean {
  return isPhraseContrastSide(pair[0]) && isPhraseContrastSide(pair[1])
}

function pickCorrectWrongFromPair(
  left: string,
  right: string,
  examplesEn: readonly string[]
): { correct: string; wrong: string } | null {
  const leftAge = matchAgeBeExample(left)
  const rightAge = matchAgeBeExample(right)
  if (leftAge && !rightAge) {
    return { correct: leftAge.correct, wrong: right.trim() || ageBeWrongForm(leftAge) }
  }
  if (rightAge && !leftAge) {
    return { correct: rightAge.correct, wrong: left.trim() || ageBeWrongForm(rightAge) }
  }

  const leftInExamples = examplesEn.some(
    (ex) => ex.toLowerCase().includes(left.toLowerCase().replace(/\.$/, ''))
  )
  const rightInExamples = examplesEn.some(
    (ex) => ex.toLowerCase().includes(right.toLowerCase().replace(/\.$/, ''))
  )
  if (leftInExamples && !rightInExamples) {
    return { correct: left.trim(), wrong: right.trim() }
  }
  if (rightInExamples && !leftInExamples) {
    return { correct: right.trim(), wrong: left.trim() }
  }

  // Age pair without full sentence in contrastPair: prefer side with years old / be.
  const leftLooksCorrect = /\byears\s+old\b/i.test(left) || /\b(am|is|are)\b/i.test(left)
  const rightLooksCorrect = /\byears\s+old\b/i.test(right) || /\b(am|is|are)\b/i.test(right)
  if (leftLooksCorrect && !rightLooksCorrect) {
    return { correct: left.trim(), wrong: right.trim() }
  }
  if (rightLooksCorrect && !leftLooksCorrect) {
    return { correct: right.trim(), wrong: left.trim() }
  }
  return null
}

const FALLBACK_AGE_EXAMPLES = [
  'I am 20 years old.',
  'She is 18 years old.',
] as const

/**
 * Choice items from age «be» examples in Explain.
 * Prefer null / empty over junk.
 */
export function buildAgeChoiceItems(
  answer: TutorExplainAnswer,
  skillTagId?: string
): TutorMicroItem[] {
  if (!DRILLABLE_KINDS.has(answer.answerKind)) return []

  const withSkill = (item: TutorMicroItem): TutorMicroItem =>
    skillTagId ? { ...item, skillTagId } : item

  const seen = new Set<string>()
  const items: TutorMicroItem[] = []

  const pushFromMatch = (match: AgeBeMatch, id: string) => {
    const key = match.correct.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    items.push(
      withSkill({
        id,
        kind: 'choice',
        promptRu: 'Какая фраза про возраст верная?',
        options: [ageBeWrongForm(match), match.correct],
        correctIndex: 1,
      })
    )
  }

  for (let i = 0; i < answer.examplesEn.length && items.length < 4; i += 1) {
    const match = matchAgeBeExample(answer.examplesEn[i]!)
    if (!match) continue
    pushFromMatch(match, `age_choice_${i}`)
  }

  if (items.length === 1) {
    for (const fallback of FALLBACK_AGE_EXAMPLES) {
      if (items.length >= 2) break
      const match = matchAgeBeExample(fallback)
      if (!match) continue
      pushFromMatch(match, 'age_choice_synth')
    }
  }

  return items.length >= 2 ? items.slice(0, 4) : []
}

/**
 * Choice items from phrase-level contrastPair (not tense labels).
 * Uses concrete phrases only — never ellipsis templates as options.
 */
export function buildPhraseContrastChoiceItems(
  answer: TutorExplainAnswer,
  skillTagId?: string
): TutorMicroItem[] {
  if (!answer.contrastPair) return []
  if (!isPhraseContrastPair(answer.contrastPair)) return []

  const [left, right] = answer.contrastPair
  const withSkill = (item: TutorMicroItem): TutorMicroItem =>
    skillTagId ? { ...item, skillTagId } : item

  const items: TutorMicroItem[] = []

  // Prefer concrete age examples from Explain when pair is age-related.
  const ageItems = buildAgeChoiceItems(answer, skillTagId)
  if (ageItems.length >= 2) return ageItems

  const pair = pickCorrectWrongFromPair(left, right, answer.examplesEn)
  if (!pair) return []
  if (pair.correct === pair.wrong) return []
  if (/[…]/.test(pair.correct) || /[…]/.test(pair.wrong) || /\.{3}/.test(pair.correct) || /\.{3}/.test(pair.wrong)) {
    return []
  }

  items.push(
    withSkill({
      id: 'phrase_choice_0',
      kind: 'choice',
      promptRu: 'Какая фраза правильная?',
      options: [pair.wrong, pair.correct],
      correctIndex: 1,
    })
  )

  // Second item: if examples have another age-like or matching sentence, add one more.
  for (let i = 0; i < answer.examplesEn.length && items.length < 2; i += 1) {
    const match = matchAgeBeExample(answer.examplesEn[i]!)
    if (!match) continue
    if (match.correct.toLowerCase() === pair.correct.toLowerCase()) continue
    items.push(
      withSkill({
        id: `phrase_choice_age_${i}`,
        kind: 'choice',
        promptRu: 'Какая фраза про возраст верная?',
        options: [ageBeWrongForm(match), match.correct],
        correctIndex: 1,
      })
    )
  }

  if (items.length < 2) {
    // Synth second age item only when pair itself is age-related.
    if (/\byears?\b/i.test(left) || /\byears?\b/i.test(right)) {
      const synth = matchAgeBeExample('She is 18 years old.')
      if (synth) {
        items.push(
          withSkill({
            id: 'phrase_choice_synth',
            kind: 'choice',
            promptRu: 'Какая фраза про возраст верная?',
            options: [ageBeWrongForm(synth), synth.correct],
            correctIndex: 1,
          })
        )
      }
    }
  }

  return items.length >= 2 ? items.slice(0, 4) : []
}
