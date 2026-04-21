function formatTopicSuggestions(topicSuggestions: string[]): string {
  const topics = topicSuggestions.map((topic) => topic.trim()).filter(Boolean).slice(0, 3)
  if (topics.length === 0) return ''
  return topics.map((topic, index) => `${index + 1}) ${topic}`).join('\n')
}

const COMPLEX_TENSES = new Set([
  'present_perfect_continuous',
  'past_perfect',
  'past_perfect_continuous',
  'future_perfect',
  'future_perfect_continuous',
])

export function buildFreeTalkFirstQuestion(params: {
  audience: 'child' | 'adult'
  level: string
  dialogSeed: string
  topicSuggestions?: string[]
  tense?: string
}): string {
  const { audience, topicSuggestions = [], tense } = params
  const isA1 = params.level === 'a1' || params.level === 'starter'
  const topics = formatTopicSuggestions(topicSuggestions)
  const base =
    isA1
      ? audience === 'child'
        ? 'What do you want to talk about?'
        : 'What do you want to talk about?'
      : audience === 'child'
        ? 'What do you want to talk about?'
        : 'What would you like to talk about?'
  const body = topics ? `${base}\nYour topic, or one of these:\n${topics}` : base
  if (!tense || !COMPLEX_TENSES.has(tense)) return body
  const warmup = '📖 Сначала задам 1–3 коротких вопроса, чтобы собрать контекст, затем перейдем к заданиям в выбранном времени.'
  return `${warmup}\n${body}`
}
