import type { Audience, SentenceType, TenseId, TopicId } from '@/lib/types'
import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import type { EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'

export function buildEngvoRealtimeInstructionsClient(params: {
  audience: Audience
  level: EngvoCefrLevel
  topic: TopicId
  speechSpeed?: number
  kind?: EngvoVoiceSessionKind
  tense?: TenseId
  sentenceType?: SentenceType
  skipTopicChoice?: boolean
  topicPreset?: string | null
}): string {
  return buildEngvoRealtimeInstructions(params)
}
