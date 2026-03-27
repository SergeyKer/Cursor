function formatTopicSuggestions(topicSuggestions: string[]): string {
  const topics = topicSuggestions.map((topic) => topic.trim()).filter(Boolean).slice(0, 3)
  if (topics.length === 0) return ''
  return topics.map((topic) => `- ${topic}`).join('\n')
}

export function buildFreeTalkFirstQuestion(params: {
  audience: 'child' | 'adult'
  level: string
  dialogSeed: string
  topicSuggestions?: string[]
}): string {
  const { audience, topicSuggestions = [] } = params
  const topics = formatTopicSuggestions(topicSuggestions)
  const base =
    audience === 'child'
      ? 'What do you want to talk about?'
      : 'What would you like to talk about?'
  if (!topics) return base
  return `${base}\nYour topic, or one of these:\n${topics}`
}
