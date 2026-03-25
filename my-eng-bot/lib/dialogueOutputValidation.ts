/**
 * Проверка согласованности вывода диалога с требуемым временем (Комментарий / Повтори / вопрос).
 */

import {
  inferTenseFromDialogueAssistantContent,
  isLikelyQuestionInRequiredTense,
  isUserLikelyCorrectForTense,
} from './dialogueTenseInference'

function stripLeadingAiPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

/**
 * @param expectedNextQuestionTense — для free_talk после верного ответа: следующий вопрос должен быть в этом времени,
 *   а не в requiredTense (время последнего вопроса/«Повтори»).
 */
export function isDialogueOutputLikelyInRequiredTense(params: {
  content: string
  requiredTense?: string
  priorAssistantContent?: string | null
  expectedNextQuestionTense?: string | null
}): boolean {
  const { content, requiredTense, priorAssistantContent, expectedNextQuestionTense } = params
  if (!requiredTense) return true
  const raw = content.trim()
  if (!raw) return false

  const lines = raw
    .split(/\r?\n/)
    .map((l) => stripLeadingAiPrefix(l))
    .map((l) => l.trim())
    .filter(Boolean)

  const repeatLine = lines.find((line) => /^(Повтори|Repeat|Say)\s*:/i.test(line))
  if (repeatLine) {
    const repeatSentence = repeatLine.replace(/^(Повтори|Repeat|Say)\s*:\s*/i, '').trim()
    if (requiredTense === 'all') {
      const inferred = priorAssistantContent ? inferTenseFromDialogueAssistantContent(priorAssistantContent) : null
      if (inferred && !isUserLikelyCorrectForTense(repeatSentence, inferred)) return false
      return true
    }
    return isUserLikelyCorrectForTense(repeatSentence, requiredTense)
  }

  const questionLine = [...lines].reverse().find((line) => /\?\s*$/.test(line) && /[A-Za-z]/.test(line))
  if (expectedNextQuestionTense && questionLine) {
    return isLikelyQuestionInRequiredTense(questionLine, expectedNextQuestionTense)
  }

  if (requiredTense === 'all') return true

  if (!questionLine) return true
  return isLikelyQuestionInRequiredTense(questionLine, requiredTense)
}
