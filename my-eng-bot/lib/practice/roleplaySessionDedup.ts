import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import {
  parseInterlocutorFromPrompt,
  parseRoleIntroFromPrompt,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import type { PracticeQuestion } from '@/types/practice'
import type { PriorSessionPhrase } from '@/lib/practice/roleplaySessionContinuity'

export function collectRecentTargetAnswers(questions: PracticeQuestion[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const question of questions) {
    const normalized = normalizeEnglishForLearnerAnswerMatch(question.targetAnswer, 'translation')
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export function collectRecentInterlocutorLines(questions: PracticeQuestion[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const question of questions) {
    if (question.type !== 'roleplay-mini') continue
    const line = parseInterlocutorFromPrompt(question.prompt)?.trim().toLowerCase()
    if (!line || seen.has(line)) continue
    seen.add(line)
    result.push(line)
  }
  return result
}

export function collectRecentRoleIntroLines(questions: PracticeQuestion[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const question of questions) {
    if (question.type !== 'roleplay-mini') continue
    const intro = parseRoleIntroFromPrompt(question.prompt)?.trim().toLowerCase()
    if (!intro || seen.has(intro)) continue
    seen.add(intro)
    result.push(intro)
  }
  return result
}

export function collectPriorSessionPhrasesFromQuestions(
  questions: PracticeQuestion[]
): PriorSessionPhrase[] {
  return questions.map((question, stepIndex) => ({
    stepIndex,
    type: question.type,
    targetAnswer: question.targetAnswer,
    prompt: question.prompt,
  }))
}
