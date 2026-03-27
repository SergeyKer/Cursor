/**
 * Строка темы из списка «1) … 2) …» → метка для buildFreeTalkTopicAnchorQuestion.
 * Убирает пояснения в скобках, чтобы не ломать вопрос.
 */
export function topicLineToAnchorLabel(topicLine: string): string {
  return topicLine
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
