import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import type { PracticeQuestion } from '@/types/practice'

export const PRACTICE_SEEN_KEYS_LIMIT = 80

export function buildSeenPracticeKeys(questions: PracticeQuestion[]): string[] {
  const unique = new Set<string>()
  for (const question of questions) {
    const key = buildPracticeQuestionFingerprintFromQuestion(question)
    if (!key) continue
    unique.add(key)
  }
  return Array.from(unique).slice(-PRACTICE_SEEN_KEYS_LIMIT)
}

export function pickUniquePracticeQuestions(
  candidates: PracticeQuestion[],
  existing: PracticeQuestion[]
): PracticeQuestion[] {
  const seen = new Set(buildSeenPracticeKeys(existing))
  const fresh: PracticeQuestion[] = []
  for (const candidate of candidates) {
    const key = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (!key || seen.has(key)) continue
    seen.add(key)
    fresh.push(candidate)
  }
  return fresh
}
