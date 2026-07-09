import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import { extractSituationKeyFromErrorFixPrompt } from '@/lib/practice/prompt/errorFixBrokenPhrase'
import {
  parseInterlocutorFromPrompt,
  parseRoleIntroFromPrompt,
  resolveRoleplayTargetAnswer,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import type { PracticeQuestion } from '@/types/practice'

function normalizePromptKey(prompt: string): string {
  return prompt.trim().toLowerCase()
}

function normalizeAnswerKey(answer: string): string {
  return normalizeEnglishForLearnerAnswerMatch(answer, 'translation')
}

export function pickFreshReferencePracticeQuestion(
  candidates: PracticeQuestion[],
  recentPrompts: string[],
  seenKeys: string[],
  recentTargetAnswers: string[] = [],
  recentInterlocutorLines: string[] = [],
  recentRoleIntroLines: string[] = [],
  recentSituationKeys: string[] = []
): PracticeQuestion | null {
  const normalizedRecent = new Set(recentPrompts.map(normalizePromptKey).filter(Boolean))
  const seen = new Set(seenKeys.filter(Boolean))
  const usedAnswers = new Set(recentTargetAnswers.map(normalizeAnswerKey).filter(Boolean))
  const usedInterlocutors = new Set(recentInterlocutorLines.map((line) => line.trim().toLowerCase()).filter(Boolean))
  const usedIntros = new Set(recentRoleIntroLines.map((line) => line.trim().toLowerCase()).filter(Boolean))
  const usedSituations = new Set(recentSituationKeys.map((key) => key.trim().toLowerCase()).filter(Boolean))

  for (const candidate of candidates) {
    const promptKey = normalizePromptKey(candidate.prompt)
    if (normalizedRecent.has(promptKey)) continue
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (!fingerprint || seen.has(fingerprint)) continue
    if (candidate.type === 'roleplay-mini') {
      const answerKey = normalizeAnswerKey(
        resolveRoleplayTargetAnswer(candidate.targetAnswer, candidate.lessonId)
      )
      if (answerKey && usedAnswers.has(answerKey)) continue
      const interlocutor = parseInterlocutorFromPrompt(candidate.prompt)?.trim().toLowerCase()
      if (interlocutor && usedInterlocutors.has(interlocutor)) continue
      const intro = parseRoleIntroFromPrompt(candidate.prompt)?.trim().toLowerCase()
      if (intro && usedIntros.has(intro)) continue
    }
    if (candidate.type === 'error-fix') {
      const situationKey = extractSituationKeyFromErrorFixPrompt(candidate.prompt)
      if (situationKey && usedSituations.has(situationKey)) continue
      const answerKey = normalizeAnswerKey(candidate.targetAnswer)
      if (answerKey && usedAnswers.has(answerKey)) continue
    }
    return candidate
  }

  return null
}
