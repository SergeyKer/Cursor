import { stableHash32 } from './freeTalkDialogueTense'

type Audience = 'child' | 'adult'

function isLowLevel(level: string): boolean {
  const normalized = level.toLowerCase()
  return ['a0', 'starter', 'a1', 'a2'].includes(normalized)
}

function buildTemplatePool(params: { audience: Audience; level: string; topicLabel: string }): string[] {
  const { audience, level, topicLabel } = params
  if (audience === 'child') {
    if (isLowLevel(level)) {
      return [
        `Got it. Let's talk about ${topicLabel}.`,
        `Okay, ${topicLabel} sounds good.`,
        `Great, we'll talk about ${topicLabel}.`,
      ]
    }
    return [
      `Got it. Let's talk about ${topicLabel}.`,
      `Nice, let's discuss ${topicLabel}.`,
      `Great choice, ${topicLabel}.`,
    ]
  }

  if (isLowLevel(level)) {
    return [
      `Got it. Let's talk about ${topicLabel}.`,
      `Okay, let's focus on ${topicLabel}.`,
      `Understood, topic is ${topicLabel}.`,
    ]
  }

  return [
    `Got it. Let's talk about ${topicLabel}.`,
    `Great, I understand. Let's discuss ${topicLabel}.`,
    `Understood, topic is ${topicLabel}.`,
  ]
}

function normalizeForComparison(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function buildFreeTalkTopicAcknowledgement(params: {
  audience: Audience
  level: string
  topicLabel: string
  seedText: string
  lastAssistantContent?: string | null
}): string {
  const topic = params.topicLabel.trim()
  if (!topic) return 'Got it.'

  const pool = buildTemplatePool({
    audience: params.audience,
    level: params.level,
    topicLabel: topic,
  })
  if (pool.length === 0) return 'Got it.'

  const baseIndex = stableHash32(
    `ft-ack|${params.audience}|${params.level.toLowerCase()}|${topic}|${params.seedText}`
  ) % pool.length
  const normalizedLast = normalizeForComparison(params.lastAssistantContent ?? '')

  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(baseIndex + offset) % pool.length] ?? ''
    if (!candidate) continue
    if (!normalizedLast) return candidate
    if (!normalizedLast.includes(normalizeForComparison(candidate))) return candidate
  }

  return pool[baseIndex] ?? 'Got it.'
}
