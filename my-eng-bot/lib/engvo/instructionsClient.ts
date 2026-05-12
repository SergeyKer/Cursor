import type { Audience, TopicId } from '@/lib/types'
import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'

export function buildEngvoRealtimeInstructionsClient(params: {
  audience: Audience
  level: EngvoCefrLevel
  topic: TopicId
}): string {
  return buildEngvoRealtimeInstructions(params)
}
