import { NextRequest, NextResponse } from 'next/server'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import { ENGVO_DEFAULT_VOICE, ENGVO_REALTIME_MODEL, isEngvoRealtimeVoice } from '@/lib/engvo/constants'
import { resolveEngvoRealtimeUserMessage } from '@/lib/engvo/errors'
import { buildEngvoCallsApiSession } from '@/lib/engvo/realtimeSession'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { Audience } from '@/lib/types'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { resolveEngvoRealtimeInstructionParams } from '@/lib/engvo/resolveRealtimeInstructionParams'

export const runtime = 'nodejs'

/** GA unified WebRTC - raw `POST /v1/realtime?model=` (beta SDP-only) отключён на стороне OpenAI. */
const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls'
const EGRESS_IP_URL = 'https://api.ipify.org?format=json'
const EGRESS_GEO_URL = 'http://ip-api.com/json'
const SDP_RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>()

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

type EgressInfo = {
  ip: string | null
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
}

async function resolveServerEgressInfo(): Promise<EgressInfo> {
  try {
    const ipResponse = await fetchWithProxyFallback(EGRESS_IP_URL, {
      method: 'GET',
      cache: 'no-store',
    })
    const ipData = (await ipResponse.json().catch(() => null)) as { ip?: string } | null
    const ip = ipData?.ip?.trim() ?? ''
    if (!ip) {
      return { ip: null, country: null, region: null, city: null, isp: null }
    }

    const geoResponse = await fetchWithProxyFallback(
      `${EGRESS_GEO_URL}/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,query`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    )
    const geoData = (await geoResponse.json().catch(() => null)) as
      | {
          status?: string
          country?: string
          regionName?: string
          city?: string
          isp?: string
        }
      | null

    return {
      ip,
      country: geoData?.status === 'success' ? geoData.country ?? null : null,
      region: geoData?.status === 'success' ? geoData.regionName ?? null : null,
      city: geoData?.status === 'success' ? geoData.city ?? null : null,
      isp: geoData?.status === 'success' ? geoData.isp ?? null : null,
    }
  } catch {
    return { ip: null, country: null, region: null, city: null, isp: null }
  }
}

export async function POST(req: NextRequest) {
  try {
    if (
      !checkIpRateLimit({
        buckets: SDP_RATE_BUCKETS,
        ip: clientIpFromRequest(req.headers),
        windowMs: 60_000,
        max: 30,
      })
    ) {
      return NextResponse.json(
        { error: 'rate_limit', userMessage: 'Слишком много запросов. Подождите.' },
        { status: 429 }
      )
    }

    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) {
      return NextResponse.json({ error: 'На сервере не задан OPENAI_API_KEY' }, { status: 500 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      sdp?: string
      audience?: Audience
      topic?: string
      voice?: string
      level?: string
      speed?: unknown
      kind?: string
      tense?: string
      sentenceType?: string
      skipTopicChoice?: boolean
      topicPreset?: string
    }
    const sdpRaw = typeof body.sdp === 'string' ? body.sdp : ''
    const sdp = sdpRaw
    if (!sdpRaw.trim()) {
      return NextResponse.json({ error: 'SDP offer is required' }, { status: 400 })
    }

    const requestedVoice = body.voice ?? ''
    const voice = isEngvoRealtimeVoice(requestedVoice) ? requestedVoice : ENGVO_DEFAULT_VOICE
    const instructionParams = resolveEngvoRealtimeInstructionParams({
      audience: body.audience,
      level: body.level,
      topic: body.topic,
      speed: body.speed,
      kind: body.kind,
      tense: body.tense,
      sentenceType: body.sentenceType,
      skipTopicChoice: body.skipTopicChoice === true,
      topicPreset: typeof body.topicPreset === 'string' ? body.topicPreset : null,
    })
    const instructions = buildEngvoRealtimeInstructions(instructionParams)

    const form = new FormData()
    form.append('sdp', sdp)
    form.append(
      'session',
      JSON.stringify(
        buildEngvoCallsApiSession({
          model: ENGVO_REALTIME_MODEL,
          voice,
          instructions,
          speed: instructionParams.speechSpeed,
        })
      )
    )

    const callsResponse = await fetchWithProxyFallback(OPENAI_REALTIME_CALLS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
    })
    const callsAnswer = await callsResponse.text()

    if (callsResponse.ok && callsAnswer.trim()) {
      return NextResponse.json({ sdp: callsAnswer })
    }

    const openAiStatus = callsResponse.status || 502
    const rawError = callsAnswer || 'Failed to initialize realtime session'
    const { userMessage, apiMessage } = resolveEngvoRealtimeUserMessage({
      raw: rawError,
      httpStatus: openAiStatus,
    })
    const egress = await resolveServerEgressInfo()
    return NextResponse.json(
      {
        error: apiMessage || rawError,
        userMessage,
        diagnostics: {
          openAiStatus,
          primaryStatus: null,
          fallbackStatus: callsResponse.status || null,
          sdpLength: sdp.length,
          egress,
        },
      },
      { status: openAiStatus }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
