import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import type { PracticeQuestion } from '@/types/practice'

function normalizePromptKey(prompt: string): string {
  return prompt.trim().toLowerCase()
}

export function pickFreshReferencePracticeQuestion(
  candidates: PracticeQuestion[],
  recentPrompts: string[],
  seenKeys: string[]
): PracticeQuestion | null {
  const normalizedRecent = new Set(recentPrompts.map(normalizePromptKey).filter(Boolean))
  const seen = new Set(seenKeys.filter(Boolean))

  for (const candidate of candidates) {
    const promptKey = normalizePromptKey(candidate.prompt)
    if (normalizedRecent.has(promptKey)) continue
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (!fingerprint || seen.has(fingerprint)) continue
    return candidate
  }

  return null
}
