import { NextRequest, NextResponse } from 'next/server'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import {
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_VOICE,
  ENGVO_REALTIME_MODEL,
  ENGVO_TRANSCRIPTION_MODEL,
  isEngvoCefrLevel,
  isEngvoRealtimeVoice,
} from '@/lib/engvo/constants'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { Audience } from '@/lib/types'

export const runtime = 'nodejs'

const OPENAI_REALTIME_SESSIONS_URL = 'https://api.openai.com/v1/realtime/sessions'
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
      audience?: Audience
      voice?: string
      level?: string
    }

    const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
    const requestedVoice = body.voice ?? ''
    const requestedLevel = body.level ?? ''
    const voice = isEngvoRealtimeVoice(requestedVoice) ? requestedVoice : ENGVO_DEFAULT_VOICE
    const level = isEngvoCefrLevel(requestedLevel) ? requestedLevel : ENGVO_DEFAULT_LEVEL
    const instructions = buildEngvoRealtimeInstructions({ audience, level })

    const response = await fetchWithProxyFallback(OPENAI_REALTIME_SESSIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: ENGVO_REALTIME_MODEL,
        modalities: ['audio', 'text'],
        voice,
        instructions,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: ENGVO_TRANSCRIPTION_MODEL,
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    })

    const data = (await response.json().catch(() => null)) as
      | {
          id?: string
          client_secret?: { value?: string; expires_at?: number }
          model?: string
          voice?: string
          error?: { message?: string } | string
        }
      | null

    if (!response.ok) {
      const errorMessage =
        typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || 'Не удалось открыть Realtime-сессию'
      const egress = await resolveServerEgressInfo()
      return NextResponse.json(
        {
          error: errorMessage,
          diagnostics: {
            openAiStatus: response.status || 502,
            egress,
          },
        },
        { status: response.status || 502 }
      )
    }

    const clientSecret = data?.client_secret?.value?.trim() ?? ''
    if (!clientSecret) {
      return NextResponse.json({ error: 'OpenAI не вернул client_secret' }, { status: 502 })
    }

    return NextResponse.json({
      id: data?.id ?? null,
      clientSecret,
      expiresAt: data?.client_secret?.expires_at ?? null,
      model: data?.model ?? ENGVO_REALTIME_MODEL,
      voice: data?.voice ?? voice,
      instructions,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
