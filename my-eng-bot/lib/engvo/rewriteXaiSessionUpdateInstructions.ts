import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import {
  resolveEngvoRealtimeInstructionParams,
  type EngvoRealtimeInstructionParams,
} from '@/lib/engvo/resolveRealtimeInstructionParams'
import { isEngvoTeacherConcreteTense } from '@/lib/engvo/sessionKind'
import type { TenseId } from '@/lib/types'

const TEACHER_AXIS_OVERRIDE_KEYS = ['teacherCurrentTense', 'teacherNextTense'] as const

export function isEngvoXaiRelayRewriteInstructionsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.ENGVO_XAI_RELAY_REWRITE_INSTRUCTIONS === '1'
}

function stripTeacherAxisOverrides(session: Record<string, unknown>): Record<string, unknown> {
  const next = { ...session }
  for (const key of TEACHER_AXIS_OVERRIDE_KEYS) {
    delete next[key]
  }
  return next
}

function readConcreteOverride(session: Record<string, unknown>, key: string): TenseId | null {
  const raw = session[key]
  return typeof raw === 'string' && isEngvoTeacherConcreteTense(raw) ? raw : null
}

/**
 * session.update for xAI relay:
 * - always strip teacherCurrentTense / teacherNextTense before upstream
 * - when rewrite flag=1: rebuild instructions from bootstrap merged with those overrides
 * - when flag=0: keep client instructions after strip
 */
export function rewriteXaiRelaySessionUpdateInstructions(params: {
  payload: string
  bootstrap: EngvoRealtimeInstructionParams
  rewriteEnabled?: boolean
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

  const rewriteEnabled =
    params.rewriteEnabled ?? isEngvoXaiRelayRewriteInstructionsEnabled()
  const currentOverride = readConcreteOverride(parsed.session, 'teacherCurrentTense')
  const nextOverride = readConcreteOverride(parsed.session, 'teacherNextTense')
  const strippedSession = stripTeacherAxisOverrides(parsed.session)

  if (!rewriteEnabled) {
    return JSON.stringify({
      ...parsed,
      session: strippedSession,
    })
  }

  const mergedBootstrap: EngvoRealtimeInstructionParams = {
    ...params.bootstrap,
    tense: currentOverride ?? params.bootstrap.tense,
  }
  const instructions = buildEngvoRealtimeInstructions({
    ...mergedBootstrap,
    nextTense: nextOverride,
  })
  return JSON.stringify({
    ...parsed,
    session: {
      ...strippedSession,
      instructions,
    },
  })
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
      teacherDrillKind: searchParams.get('teacherDrillKind') ?? searchParams.get('drillKind') ?? undefined,
      teacherLessonId: searchParams.get('teacherLessonId') ?? searchParams.get('lessonId'),
      teacherEffectiveLessonId:
        searchParams.get('teacherEffectiveLessonId') ?? searchParams.get('effectiveLessonId'),
      sessionSeed: searchParams.get('sessionSeed'),
      teacherCurrentTense: searchParams.get('teacherCurrentTense') ?? undefined,
      teacherNextTense: searchParams.get('teacherNextTense') ?? undefined,
    },
    'xai'
  )
}
