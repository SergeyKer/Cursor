import {
  buildAgeChoiceItems,
  buildPhraseContrastChoiceItems,
} from '@/lib/tutor/buildMicroChoiceItems'
import type { TutorExplainAnswer, TutorMicroItem, TutorMicroPack } from '@/lib/tutor/types'
import { isTutorMicroPackEligible } from '@/lib/tutor/microEligible'
import { normalizeTutorMicroPack } from '@/lib/tutor/normalizeMicro'

function skillFrom(answer: TutorExplainAnswer): string | undefined {
  return answer.topicAnchor.skillTagIds?.[0] || answer.topicAnchor.canonicalKey || undefined
}

const DISTRACTOR_PAIRS = [
  'a / an / the',
  'will / going to',
  'much / many',
  'in / on / at',
  'this / these',
] as const

function distractorPair(left: string, right: string): string {
  const joined = `${left} ${right}`.toLowerCase()
  for (const pair of DISTRACTOR_PAIRS) {
    const tokens = pair.split(/[\s/]+/).filter(Boolean)
    if (tokens.some((tok) => joined.includes(tok.toLowerCase()))) continue
    return pair
  }
  return 'much / many'
}

/**
 * Infer which contrast side fits an EN example (local heuristic, not LLM).
 * Returns null when unsure — skip the item rather than guess wrong.
 */
export function inferContrastCorrectIndex(
  exampleEn: string,
  left: string,
  right: string
): 0 | 1 | null {
  const ex = exampleEn.toLowerCase()
  const l = left.toLowerCase()
  const r = right.toLowerCase()

  const scoreSide = (label: string): number => {
    let score = 0
    if (/perfect/.test(label)) {
      if (/\b(have|has|'ve|'s)\b/.test(ex) && /\b\w+ed\b|\b(been|gone|done|lost|seen|written)\b/.test(ex)) {
        score += 2
      }
      if (/\b(already|yet|ever|never|just)\b/.test(ex)) score += 2
      if (/\b(yesterday|ago|last\s+\w+)\b/.test(ex)) score -= 2
    }
    if (/past\s*simple|past\b/.test(label) && !/perfect|continuous|progressive/.test(label)) {
      if (/\b(yesterday|ago|last\s+\w+)\b/.test(ex)) score += 2
      if (/\b(have|has|'ve)\b/.test(ex) && /\b(already|yet|ever|never|just)\b/.test(ex)) score -= 2
    }
    if (/continuous|progressive/.test(label)) {
      if (/\b(am|is|are|was|were)\b.+\b\w+ing\b/.test(ex)) score += 2
    }
    if (/present\s*simple/.test(label)) {
      if (/\b(every|usually|often|always|sometimes)\b/.test(ex)) score += 2
    }
    if (/\ba\b|\ban\b|\bthe\b/.test(label)) {
      // articles: weak local signal — leave null unless obvious
    }
    return score
  }

  const leftScore = scoreSide(l)
  const rightScore = scoreSide(r)
  if (leftScore === rightScore) return null
  return leftScore > rightScore ? 0 : 1
}

/**
 * Build a local micro pack from Explain fields (no extra LLM).
 * Prefer null over junk (no «Тема сейчас?», no random have→had traps).
 */
export function buildTutorMicroPackFromExplain(answer: TutorExplainAnswer): TutorMicroPack | null {
  const skillTagId = skillFrom(answer)
  const items: TutorMicroItem[] = []
  const topic = answer.topicAnchor.title || answer.title
  const withSkill = (item: TutorMicroItem): TutorMicroItem =>
    skillTagId ? { ...item, skillTagId } : item

  if (answer.contrastPair) {
    const [left, right] = answer.contrastPair
    const pairLabel = `${left} / ${right}`
    items.push(
      withSkill({
        id: 'contrast_pair',
        kind: 'pick_side',
        promptRu: 'Какие формы сейчас сравниваем?',
        options: [pairLabel, distractorPair(left, right)],
        correctIndex: 0,
      })
    )

    for (let i = 0; i < answer.examplesEn.length && items.length < 4; i += 1) {
      const ex = answer.examplesEn[i]!
      const idx = inferContrastCorrectIndex(ex, left, right)
      if (idx == null) continue
      items.push(
        withSkill({
          id: `contrast_fit_${i}`,
          kind: 'best_fit',
          promptRu: `Какая форма подходит к примеру: ${ex}`,
          options: [left, right],
          correctIndex: idx,
        })
      )
    }

    if (answer.examplesEn.length >= 2 && items.length < 4) {
      const [ex0, ex1] = answer.examplesEn
      const idx0 = inferContrastCorrectIndex(ex0!, left, right)
      if (idx0 === 0 || idx0 === 1) {
        const promptSide = idx0 === 0 ? left : right
        items.push(
          withSkill({
            id: 'contrast_which_example',
            kind: 'best_fit',
            promptRu: `Какой пример про «${promptSide}»?`,
            options: [ex0!, ex1!],
            correctIndex: 0,
          })
        )
      }
    }
  }

  // Phrase / age choice only when tense contrast did not yield a pack.
  if (items.length < 2) {
    const phraseItems = buildPhraseContrastChoiceItems(answer, skillTagId)
    if (phraseItems.length >= 2) {
      items.push(...phraseItems)
    }
  }

  if (items.length < 2) {
    const ageItems = buildAgeChoiceItems(answer, skillTagId)
    if (ageItems.length >= 2) {
      items.push(...ageItems)
    }
  }

  if (items.length < 2) return null

  const summaryRu =
    answer.rememberRu || `Коротко: ${topic}. Можно уточнить или открыть шпаргалку.`

  const pack = normalizeTutorMicroPack({ items, summaryRu })
  if (!pack) return null
  if (!isTutorMicroPackEligible(pack, answer)) return null
  return pack
}
