/**
 * Проверка согласованности вывода диалога с требуемым временем (Комментарий / Скажи / вопрос).
 */

import {
  inferTenseFromDialogueAssistantContent,
  isLikelyQuestionInRequiredTense,
  isUserLikelyCorrectForTense,
} from './dialogueTenseInference'
import { isRepeatSemanticallySafe } from './dialogueSemanticGuard'

function stripLeadingAiPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

/**
 * @param expectedNextQuestionTense — для free_talk после верного ответа: следующий вопрос должен быть в этом времени,
 *   а не в requiredTense (время последнего вопроса/«Скажи»).
 */
export type DialogueTenseValidationReason =
  | 'next_question_tense_mismatch'
  | 'required_tense_mismatch'
  | 'semantic_mismatch'

export function validateDialogueOutputTense(params: {
  content: string
  requiredTense?: string
  priorAssistantContent?: string | null
  expectedNextQuestionTense?: string | null
  lastUserText?: string
}): { ok: boolean; reason?: DialogueTenseValidationReason } {
  const { content, requiredTense, priorAssistantContent, expectedNextQuestionTense, lastUserText } = params
  if (!requiredTense) return { ok: true }
  const raw = content.trim()
  if (!raw) return { ok: false, reason: 'required_tense_mismatch' }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => stripLeadingAiPrefix(l))
    .map((l) => l.trim())
    .filter(Boolean)

  const repeatLine = lines.find((line) => /^(?:Скажи|Say|Повтори|Repeat)\s*:/i.test(line))
  if (repeatLine) {
    const repeatSentence = repeatLine.replace(/^(?:Скажи|Say|Повтори|Repeat)\s*:\s*/i, '').trim()
    if (lastUserText && !isRepeatSemanticallySafe({ userText: lastUserText, repeatSentence })) {
      return { ok: false, reason: 'semantic_mismatch' }
    }
    if (requiredTense === 'all') {
      const inferred = priorAssistantContent ? inferTenseFromDialogueAssistantContent(priorAssistantContent) : null
      if (inferred && !isUserLikelyCorrectForTense(repeatSentence, inferred)) {
        return { ok: false, reason: 'required_tense_mismatch' }
      }
      return { ok: true }
    }
    return isUserLikelyCorrectForTense(repeatSentence, requiredTense)
      ? { ok: true }
      : { ok: false, reason: 'required_tense_mismatch' }
  }

  const questionLine = [...lines].reverse().find((line) => /\?\s*$/.test(line) && /[A-Za-z]/.test(line))
  if (expectedNextQuestionTense && questionLine) {
    return isLikelyQuestionInRequiredTense(questionLine, expectedNextQuestionTense)
      ? { ok: true }
      : { ok: false, reason: 'next_question_tense_mismatch' }
  }

  if (requiredTense === 'all') return { ok: true }

  if (!questionLine) return { ok: true }
  return isLikelyQuestionInRequiredTense(questionLine, requiredTense)
    ? { ok: true }
    : { ok: false, reason: 'required_tense_mismatch' }
}

export function isDialogueOutputLikelyInRequiredTense(params: {
  content: string
  requiredTense?: string
  priorAssistantContent?: string | null
  expectedNextQuestionTense?: string | null
  lastUserText?: string
}): boolean {
  return validateDialogueOutputTense(params).ok
}
