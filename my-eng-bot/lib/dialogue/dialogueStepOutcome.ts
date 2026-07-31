import { hashDialogueAssistantKey, type DialogueStepOutcome } from '@/lib/dialogue/dialogueSessionEconomy'

const REPEAT_LINE_RE = /(^|\n)\s*(Скажи|Say|Повтори|Repeat)\s*:/im
/** Canon free_talk invite; excludes "talk about next" (mid-session fallback) and "did you talk about". */
const TOPIC_INVITE_RE =
  /what\s+(?:do\s+you\s+want|would\s+you\s+like)\s+to\s+talk\s+about(?:\s+(?:today|now))?\s*\?/i
const TOPIC_MENU_LABEL_RE = /your\s+topic,\s+or\s+one\s+of\s+these/i
const TOPIC_MENU_ITEMS_RE = /(?:^|\n)\s*1\s*[.)][\s\S]*(?:^|\n)\s*2\s*[.)]/m
const TOPIC_SWITCH_REFUSAL_RE =
  /we stay on the current topic|оста(е|ё)мся на (текущей|этой) теме|switch to Free Topic/i
const NUMBERED_CHOICE_RE = /^\s*[1-9]\s*$/

function hasNextQuestionShape(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (REPEAT_LINE_RE.test(trimmed)) return false
  return /\?\s*$|[A-Za-z].*\?/m.test(trimmed)
}

function isTopicMenu(content: string): boolean {
  const text = typeof content === 'string' ? content : ''
  if (!text.trim()) return false
  if (TOPIC_MENU_LABEL_RE.test(text)) return true
  return TOPIC_MENU_ITEMS_RE.test(text)
}

function isTopicSolicitation(content: string | null | undefined): boolean {
  if (!content || typeof content !== 'string') return false
  const text = content.trim()
  if (!text) return false
  if (TOPIC_INVITE_RE.test(text)) return true
  return isTopicMenu(text)
}

function looksLikeMetaNonStep(params: {
  assistantContent: string
  userContent: string
  prevAssistantContent?: string | null
}): boolean {
  const { assistantContent, userContent, prevAssistantContent } = params
  if (isTopicSolicitation(assistantContent)) return true
  if (isTopicSolicitation(prevAssistantContent)) return true
  if (NUMBERED_CHOICE_RE.test(userContent.trim()) && isTopicMenu(prevAssistantContent ?? '')) {
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
  if (
    looksLikeMetaNonStep({
      assistantContent,
      userContent,
      prevAssistantContent: params.prevAssistantContent,
    })
  ) {
    return null
  }

  const outcome: DialogueStepOutcome = previousHadRepeat(params.prevAssistantContent)
    ? 'recovered'
    : 'success'

  return {
    outcome,
    assistantKey: hashDialogueAssistantKey(assistantContent),
  }
}
