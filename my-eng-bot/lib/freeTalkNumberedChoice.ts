export type FreeTalkNumberedChoiceResult =
  | { kind: 'not-number' }
  | { kind: 'invalid-number'; index: number }
  | { kind: 'resolved'; index: number; topic: string }

function parseNumberedTopicLines(assistantText: string): string[] {
  const topics: string[] = []
  const lines = assistantText.split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\)\s+(.+?)\s*$/)
    if (!match) continue
    const rawTopic = (match[2] ?? '').trim()
    if (!rawTopic) continue
    topics.push(rawTopic)
  }
  return topics
}

export function resolveFreeTalkNumberedChoice(params: {
  userText: string
  assistantText: string
  maxChoice?: number
}): FreeTalkNumberedChoiceResult {
  const { userText, assistantText, maxChoice = 3 } = params
  const normalized = userText.trim()
  const numericOnly = normalized.match(/^(\d+)\s*[).,!?:;]*\s*$/)
  if (!numericOnly) return { kind: 'not-number' }

  const index = Number.parseInt(numericOnly[1] ?? '', 10)
  if (!Number.isFinite(index) || index < 1 || index > maxChoice) {
    return { kind: 'invalid-number', index: Number.isFinite(index) ? index : -1 }
  }

  const topics = parseNumberedTopicLines(assistantText)
  const topic = topics[index - 1]?.trim()
  if (!topic) return { kind: 'invalid-number', index }

  return { kind: 'resolved', index, topic }
}

