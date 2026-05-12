import { NextRequest, NextResponse } from 'next/server'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import {
  buildEngvoInputAudioTranscriptionConfig,
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_VOICE,
  ENGVO_REALTIME_MODEL,
  ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION,
  clampEngvoRealtimeSpeed,
  isEngvoCefrLevel,
  isEngvoRealtimeVoice,
} from '@/lib/engvo/constants'
import { TOPICS } from '@/lib/constants'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { Audience, TopicId } from '@/lib/types'

export const runtime = 'nodejs'

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls'
const OPENAI_REALTIME_URL = `https://api.openai.com/v1/realtime?model=${ENGVO_REALTIME_MODEL}`
const EGRESS_IP_URL = 'https://api.ipify.org?format=json'
const EGRESS_GEO_URL = 'http://ip-api.com/json'

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
    }
    const sdpRaw = typeof body.sdp === 'string' ? body.sdp : ''
    const sdp = sdpRaw
    if (!sdpRaw.trim()) {
      return NextResponse.json({ error: 'SDP offer is required' }, { status: 400 })
    }

    const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
    const requestedVoice = body.voice ?? ''
    const requestedLevel = body.level ?? ''
    const requestedTopic = body.topic ?? ''
    const voice = isEngvoRealtimeVoice(requestedVoice) ? requestedVoice : ENGVO_DEFAULT_VOICE
    const level = isEngvoCefrLevel(requestedLevel) ? requestedLevel : ENGVO_DEFAULT_LEVEL
    const topicIds = new Set<TopicId>(TOPICS.map((item) => item.id))
    const topic = topicIds.has(requestedTopic as TopicId) ? (requestedTopic as TopicId) : 'free_talk'
    const instructions = buildEngvoRealtimeInstructions({ audience, level, topic })
    const speed =
      typeof body.speed === 'number' && Number.isFinite(body.speed) ? clampEngvoRealtimeSpeed(body.speed) : 1

    // OpenAI Realtime server path differs across model families/releases.
    // We try raw SDP first, then FormData fallback.
    const rawResponse = await fetchWithProxyFallback(OPENAI_REALTIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/sdp',
      },
      body: sdp,
    })
    const rawAnswer = await rawResponse.text()
    if (rawResponse.ok && rawAnswer.trim()) {
      return NextResponse.json({ sdp: rawAnswer })
    }

    const form = new FormData()
    form.append('sdp', sdp)
    form.append(
      'session',
      JSON.stringify({
        model: ENGVO_REALTIME_MODEL,
        voice,
        instructions,
        speed,
        audio: {
          input: {
            transcription: buildEngvoInputAudioTranscriptionConfig(),
            turn_detection: { ...ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION },
          },
        },
      })
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

    const egress = await resolveServerEgressInfo()
    return NextResponse.json(
      {
        error: callsAnswer || rawAnswer || 'Failed to initialize realtime session',
        diagnostics: {
          openAiStatus: callsResponse.status || rawResponse.status || 502,
          primaryStatus: rawResponse.status || null,
          fallbackStatus: callsResponse.status || null,
          sdpLength: sdp.length,
          egress,
        },
      },
      { status: callsResponse.status || rawResponse.status || 502 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
