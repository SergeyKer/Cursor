import type { ChatMessage } from './types'
import { buildFreeTalkTopicAnchorQuestion } from './freeTalkQuestionAnchor'
import { isLikelyQuestionInRequiredTense } from './dialogueTenseInference'
import { resolveFreeTalkNumberedChoice } from './freeTalkNumberedChoice'
import { topicLineToAnchorLabel } from './topicAnchorLabel'

function getLastAssistantContent(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') return messages[i]?.content ?? null
  }
  return null
}

function extractLastEnglishQuestionLine(content: string): string | null {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? ''
    if (/\?\s*$/.test(line) && /[A-Za-z]/.test(line)) return line
  }
  return null
}

/**
 * Если после выбора темы (1/2/3) модель выдала вопрос, не похожий на требуемое время — подставляем якорный вопрос.
 */
export function applyFreeTalkTopicChoiceTenseAnchorFallback(params: {
  content: string
  recentMessages: ChatMessage[]
  userText: string
  tense: string
  audience: 'child' | 'adult'
}): string {
  const assistantText = getLastAssistantContent(params.recentMessages)
  if (!assistantText) return params.content
  const resolved = resolveFreeTalkNumberedChoice({ userText: params.userText, assistantText })
  if (resolved.kind !== 'resolved') return params.content
  const q = extractLastEnglishQuestionLine(params.content)
  if (!q) return params.content
  if (isLikelyQuestionInRequiredTense(q, params.tense)) return params.content
  return buildFreeTalkTopicAnchorQuestion({
    keywords: [],
    topicLabel: topicLineToAnchorLabel(resolved.topic),
    tense: params.tense,
    audience: params.audience,
    diversityKey: `topic-choice-fallback|${resolved.topic}|${params.tense}`,
  })
}
