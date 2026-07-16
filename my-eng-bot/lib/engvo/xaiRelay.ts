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

export type EngvoXaiRelayForwardPayload = {
  payload: string | Buffer
  binary: boolean
}

function bufferFromUnknown(data: unknown): Buffer | null {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) return data
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  }
  if (Array.isArray(data) && data.every((part) => typeof Buffer !== 'undefined' && Buffer.isBuffer(part))) {
    return Buffer.concat(data as Buffer[])
  }
  return null
}

/**
 * Decode a WebSocket text frame that Node `ws` delivered as Buffer (isBinary=false).
 * Returns null for binary frames / undecodable payloads.
 */
export function decodeRelayWsTextPayload(data: unknown, isBinary: boolean): string | null {
  if (isBinary) return null
  if (typeof data === 'string') return data
  const buf = bufferFromUnknown(data)
  if (buf) return buf.toString('utf8')
  return null
}

/**
 * Prepare a frame for relay forwarding.
 * Text (!isBinary) must go as UTF-8 string with binary:false so browsers get text frames.
 * Binary stays bytes with binary:true.
 */
export function encodeRelayForwardPayload(
  data: unknown,
  isBinary: boolean
): EngvoXaiRelayForwardPayload {
  if (!isBinary) {
    if (typeof data === 'string') return { payload: data, binary: false }
    const text = decodeRelayWsTextPayload(data, false)
    if (text !== null) return { payload: text, binary: false }
  }
  if (typeof data === 'string') return { payload: data, binary: true }
  const buf = bufferFromUnknown(data)
  if (buf) return { payload: buf, binary: true }
  return { payload: String(data), binary: Boolean(isBinary) }
}

export function relayForwardPayloadByteLength(frame: EngvoXaiRelayForwardPayload): number {
  if (typeof frame.payload === 'string') return Buffer.byteLength(frame.payload, 'utf8')
  return frame.payload.length
}

export function isRelaySessionUpdatePayload(payload: string | Buffer): boolean {
  const asString = typeof payload === 'string' ? payload : payload.toString('utf8')
  if (!asString.includes('session.update')) return false
  try {
    const parsed = JSON.parse(asString) as { type?: string }
    return parsed.type === 'session.update'
  } catch {
    return false
  }
}
