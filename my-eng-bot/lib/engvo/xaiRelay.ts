import { ENGVO_XAI_MODEL, ENGVO_XAI_REALTIME_URL } from '@/lib/engvo/constants'

export const ENGVO_XAI_RELAY_PATH = '/api/realtime-session/xai-relay'

/** Sent to browser when relay upstream xAI WebSocket is open. */
export const ENGVO_XAI_RELAY_READY_EVENT = 'relay.ready' as const

export const XAI_RELAY_UPSTREAM_TIMEOUT_MS = 10_000
export const XAI_RELAY_CLIENT_BUFFER_MAX_BYTES = 512_000
export const XAI_RELAY_CLIENT_BUFFER_MAX_FRAMES = 64

export const XAI_RELAY_CLOSE_POLICY = 1008
export const XAI_RELAY_CLOSE_INTERNAL = 1011

/** Voice models allowed on the relay upgrade query string. */
export const XAI_RELAY_ALLOWED_MODELS = [
  'grok-voice-latest',
  'grok-voice-think-fast-1.0',
  'grok-voice-fast-1.0',
] as const

export type XaiRelayAllowedModel = (typeof XAI_RELAY_ALLOWED_MODELS)[number]

function normalizeHost(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  try {
    const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    return new URL(withScheme).host.toLowerCase()
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

function parseAllowedOriginsEnv(raw: string | undefined): Set<string> {
  const set = new Set<string>()
  if (!raw?.trim()) return set
  for (const part of raw.split(',')) {
    const host = normalizeHost(part)
    if (host) set.add(host)
  }
  return set
}

export function isAllowedXaiRelayModel(model: string): model is XaiRelayAllowedModel {
  return (XAI_RELAY_ALLOWED_MODELS as readonly string[]).includes(model)
}

export function resolveXaiRelayModel(modelParam: string | null | undefined): XaiRelayAllowedModel {
  const model = modelParam?.trim() ?? ''
  if (model && isAllowedXaiRelayModel(model)) return model
  return ENGVO_XAI_MODEL as XaiRelayAllowedModel
}

/** Browser-side relay WebSocket URL (same origin). */
export function buildEngvoXaiRelayWsUrl(
  model: string = ENGVO_XAI_MODEL,
  locationLike?: Pick<Location, 'protocol' | 'host'>
): string {
  const protocol =
    locationLike?.protocol === 'https:' || locationLike?.protocol === 'http:'
      ? locationLike.protocol === 'https:'
        ? 'wss:'
        : 'ws:'
      : typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? 'wss:'
        : 'ws:'
  const host = locationLike?.host ?? (typeof window !== 'undefined' ? window.location.host : 'localhost:3000')
  const url = new URL(`${protocol}//${host}${ENGVO_XAI_RELAY_PATH}`)
  url.searchParams.set('model', resolveXaiRelayModel(model))
  return url.toString()
}

/** Server-side upstream URL to xAI Realtime API. */
export function buildXaiUpstreamWsUrl(model: string = ENGVO_XAI_MODEL): string {
  const url = new URL(ENGVO_XAI_REALTIME_URL)
  url.searchParams.set('model', resolveXaiRelayModel(model))
  return url.toString()
}

export function isAllowedRelayOrigin(params: {
  origin: string | null
  host: string | null
  allowedOriginsEnv?: string
}): boolean {
  const requestHost = normalizeHost(params.host ?? '')
  if (!requestHost) return false

  const extra = parseAllowedOriginsEnv(params.allowedOriginsEnv ?? process.env.ENGVO_ALLOWED_ORIGINS)
  if (extra.has(requestHost)) return true

  const origin = params.origin?.trim() ?? ''
  if (!origin) return false

  const originHost = normalizeHost(origin)
  return originHost === requestHost
}

export function buildXaiRelayErrorFrame(message: string, code?: string): string {
  return JSON.stringify({
    type: 'error',
    error: {
      message,
      ...(code ? { code } : {}),
    },
  })
}
