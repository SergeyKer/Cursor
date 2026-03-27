import { stableHash32 } from './freeTalkDialogueTense'

function formatTopicSuggestions(topicSuggestions: string[]): string {
  const topics = topicSuggestions.map((topic) => topic.trim()).filter(Boolean).slice(0, 3)
  if (topics.length === 0) return ''
  if (topics.length === 1) return topics[0]!
  if (topics.length === 2) return `${topics[0]} or ${topics[1]}`
  return `${topics[0]}, ${topics[1]}, or ${topics[2]}`
}

export function buildFreeTalkFirstQuestion(params: {
  audience: 'child' | 'adult'
  level: string
  dialogSeed: string
  topicSuggestions?: string[]
}): string {
  const { audience, level, dialogSeed, topicSuggestions = [] } = params
  const normalizedLevel = level.toLowerCase()
  const isLowLevel = ['a0', 'starter', 'a1', 'a2'].includes(normalizedLevel)
  const topics = formatTopicSuggestions(topicSuggestions)

  const childVariants = isLowLevel
    ? [
        'What do you want to talk about?',
        'What do you want to talk about today?',
        'Tell me what you want to talk about.',
      ]
    : [
        'What do you want to talk about today?',
        'What do you want to talk about?',
        'Tell me what you want to talk about.',
      ]

  const adultVariants = isLowLevel
    ? [
        'What would you like to talk about?',
        'What do you want to talk about?',
        'Tell me what you want to talk about.',
      ]
    : [
        'What would you like to talk about today?',
        'What would you like to talk about?',
        'Tell me what you want to talk about.',
      ]

  const variants = audience === 'child' ? childVariants : adultVariants
  const seed = stableHash32(`ft-first|${audience}|${normalizedLevel}|${dialogSeed}`)
  const idx = seed % variants.length
  const base = variants[idx] ?? variants[0] ?? 'What do you want to talk about?'
  if (!topics) return base
  return `${base} Topics: ${topics}.`
}
