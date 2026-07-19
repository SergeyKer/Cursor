import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import {
  resolveEngvoRealtimeInstructionParams,
  type EngvoRealtimeInstructionParams,
} from '@/lib/engvo/resolveRealtimeInstructionParams'
import { appendEngvoXaiUnclearAudioRule } from '@/lib/engvo/xaiListenPolicy'

export function isEngvoXaiRelayRewriteInstructionsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.ENGVO_XAI_RELAY_REWRITE_INSTRUCTIONS === '1'
}

/**
 * Replace client-supplied session.instructions with server-built canonical text.
 * Returns original payload when not a session.update or when parse fails.
 */
export function rewriteXaiRelaySessionUpdateInstructions(params: {
  payload: string
  bootstrap: EngvoRealtimeInstructionParams
}): string {
  let parsed: { type?: string; session?: Record<string, unknown> }
  try {
    parsed = JSON.parse(params.payload) as { type?: string; session?: Record<string, unknown> }
  } catch {
    return params.payload
  }
  if (parsed.type !== 'session.update' || !parsed.session || typeof parsed.session !== 'object') {
    return params.payload
  }

  const instructions = appendEngvoXaiUnclearAudioRule(
    buildEngvoRealtimeInstructions(params.bootstrap)
  )
  const next = {
    ...parsed,
    session: {
      ...parsed.session,
      instructions,
    },
  }
  return JSON.stringify(next)
}

export function resolveRelayBootstrapFromSearchParams(
  searchParams: URLSearchParams
): EngvoRealtimeInstructionParams {
  return resolveEngvoRealtimeInstructionParams(
    {
      audience: searchParams.get('audience') ?? undefined,
      level: searchParams.get('level') ?? undefined,
      topic: searchParams.get('topic') ?? undefined,
      speed: searchParams.get('speed'),
      kind: searchParams.get('kind') ?? undefined,
      tense: searchParams.get('tense') ?? undefined,
      sentenceType: searchParams.get('sentenceType') ?? undefined,
      skipTopicChoice: searchParams.get('skipTopicChoice') ?? undefined,
      topicPreset: searchParams.get('topicPreset'),
    },
    'xai'
  )
}
