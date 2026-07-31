import { hashDialogueAssistantKey, type DialogueStepOutcome } from '@/lib/dialogue/dialogueSessionEconomy'

const REPEAT_LINE_RE = /(^|\n)\s*(Скажи|Say|Повтори|Repeat)\s*:/im
const TOPIC_MENU_RE = /^\s*1\s*[.)]/m
const TOPIC_SWITCH_REFUSAL_RE =
  /we stay on the current topic|оста(е|ё)мся на (текущей|этой) теме|switch to Free Topic/i
const NUMBERED_CHOICE_RE = /^\s*[1-9]\s*$/

function hasNextQuestionShape(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (REPEAT_LINE_RE.test(trimmed)) return false
  return /\?\s*$|[A-Za-z].*\?/m.test(trimmed)
}

function looksLikeMetaNonStep(params: {
  assistantContent: string
  userContent: string
}): boolean {
  const { assistantContent, userContent } = params
  if (NUMBERED_CHOICE_RE.test(userContent.trim()) && TOPIC_MENU_RE.test(assistantContent)) {
    return true
  }
  if (TOPIC_SWITCH_REFUSAL_RE.test(assistantContent)) return true
  // Domain clarification: short ack-style without advancing as a graded drill question chain
  if (
    /did you mean|вы имели в виду|what do you mean by/i.test(assistantContent) &&
    userContent.trim().split(/\s+/).length <= 2
  ) {
    return true
  }
  return false
}

function previousHadRepeat(prevAssistantContent: string | null | undefined): boolean {
  if (!prevAssistantContent) return false
  return REPEAT_LINE_RE.test(prevAssistantContent)
}

/**
 * Читает исход хода диалога без смены протокола.
 * Eligible step = dialogueCorrect + next-question shape − meta false-positives.
 */
export function resolveDialogueStepAward(params: {
  dialogueCorrect?: boolean | null
  assistantContent: string
  userContent?: string | null
  prevAssistantContent?: string | null
}): {
  outcome: DialogueStepOutcome
  assistantKey: string
} | null {
  if (!params.dialogueCorrect) return null
  const assistantContent = typeof params.assistantContent === 'string' ? params.assistantContent : ''
  const userContent = typeof params.userContent === 'string' ? params.userContent : ''
  if (!hasNextQuestionShape(assistantContent)) return null
  if (looksLikeMetaNonStep({ assistantContent, userContent })) return null

  const outcome: DialogueStepOutcome = previousHadRepeat(params.prevAssistantContent)
    ? 'recovered'
    : 'success'

  return {
    outcome,
    assistantKey: hashDialogueAssistantKey(assistantContent),
  }
}
