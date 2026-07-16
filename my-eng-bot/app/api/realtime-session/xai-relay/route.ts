import type { NextRequest } from 'next/server'
import { experimental_upgradeWebSocket } from '@vercel/functions'
import type { RawData } from 'ws'
import WebSocket from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT } from '@/lib/engvo/pcm'
import {
  buildXaiRelayErrorFrame,
  buildXaiUpstreamWsUrl,
  isAllowedRelayOrigin,
  resolveXaiRelayModel,
  XAI_RELAY_CLIENT_BUFFER_MAX_BYTES,
  XAI_RELAY_CLIENT_BUFFER_MAX_FRAMES,
  XAI_RELAY_CLOSE_INTERNAL,
  XAI_RELAY_UPSTREAM_TIMEOUT_MS,
  ENGVO_XAI_RELAY_READY_EVENT,
} from '@/lib/engvo/xaiRelay'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE } from '@/lib/engvo/errors'
import { engvoServerDebugLog } from '@/lib/engvo/debugSession79b473Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type WebSocketData = RawData

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxy =
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    ''
  if (!proxy) return undefined
  return new HttpsProxyAgent(proxy)
}

function createUpstreamWebSocket(url: string, apiKey: string): WebSocket {
  const agent = getProxyAgent()
  return new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    ...(agent ? { agent } : {}),
  })
}

function toMessageData(data: WebSocketData): string | Buffer | ArrayBuffer {
  if (typeof data === 'string') return data
  if (Buffer.isBuffer(data)) return data
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  }
  return String(data)
}

function messageByteLength(data: WebSocketData): number {
  if (typeof data === 'string') return Buffer.byteLength(data, 'utf8')
  if (Buffer.isBuffer(data)) return data.length
  if (ArrayBuffer.isView(data)) return data.byteLength
  return Buffer.byteLength(String(data), 'utf8')
}

function closeRelayPair(params: {
  clientWs: WebSocket
  upstream: WebSocket | null
  code: number
  reason: string
  errorMessage?: string
}) {
  const { clientWs, upstream, code, reason, errorMessage } = params
  if (errorMessage && clientWs.readyState === WebSocket.OPEN) {
    try {
      clientWs.send(buildXaiRelayErrorFrame(errorMessage, 'relay_error'))
    } catch {
      // ignore
    }
  }
  try {
    if (upstream && upstream.readyState === WebSocket.OPEN) upstream.close(code, reason)
  } catch {
    // ignore
  }
  try {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code, reason)
  } catch {
    // ignore
  }
}

function isClientSessionUpdateFrame(data: WebSocketData): boolean {
  const asString = typeof data === 'string' ? data : data.toString()
  if (!asString.includes('session.update')) return false
  try {
    const parsed = JSON.parse(asString) as { type?: string }
    return parsed.type === 'session.update'
  } catch {
    return false
  }
}

function forwardWithBackpressure(to: WebSocket, data: WebSocketData): boolean {
  if (to.readyState !== WebSocket.OPEN) return false
  if (to.bufferedAmount > ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT) {
    const asString = typeof data === 'string' ? data : data.toString()
    if (asString.includes('input_audio_buffer.append')) {
      console.warn('[engvo][xai-relay] dropping mic append due to backpressure')
      return false
    }
  }
  try {
    to.send(toMessageData(data))
    return true
  } catch (error) {
    console.warn('[engvo][xai-relay] forward failed', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!isAllowedRelayOrigin({ origin, host })) {
    return new Response('Forbidden', { status: 403 })
  }

  const model = resolveXaiRelayModel(request.nextUrl.searchParams.get('model'))
  const apiKey = normalizeKey(process.env.XAI_API_KEY ?? '')
  if (!apiKey) {
    return new Response(ENGVO_XAI_MISSING_KEY_USER_MESSAGE, { status: 500 })
  }

  const upstreamUrl = buildXaiUpstreamWsUrl(model)

  return experimental_upgradeWebSocket((clientWs) => {
    let upstream: WebSocket | null = null
    let closed = false
    let upstreamOpen = false
    let clientSessionUpdateSeen = false
    const pendingClientFrames: WebSocketData[] = []
    let pendingClientBytes = 0
    const bufferedUpstreamFrames: WebSocketData[] = []

    const shutdown = (code: number, reason: string, errorMessage?: string) => {
      if (closed) return
      closed = true
      closeRelayPair({ clientWs, upstream, code, reason, errorMessage })
    }

    const flushPendingClientFrames = () => {
      if (!upstream || !upstreamOpen || upstream.readyState !== WebSocket.OPEN) return
      while (pendingClientFrames.length > 0) {
        const frame = pendingClientFrames.shift()
        if (!frame) break
        pendingClientBytes -= messageByteLength(frame)
        if (!forwardWithBackpressure(upstream, frame)) {
          shutdown(XAI_RELAY_CLOSE_INTERNAL, 'forward_failed')
          return
        }
      }
    }

    const enqueueClientFrame = (data: WebSocketData) => {
      if (closed) return
      const frameBytes = messageByteLength(data)
      if (
        pendingClientFrames.length >= XAI_RELAY_CLIENT_BUFFER_MAX_FRAMES ||
        pendingClientBytes + frameBytes > XAI_RELAY_CLIENT_BUFFER_MAX_BYTES
      ) {
        shutdown(
          XAI_RELAY_CLOSE_INTERNAL,
          'client_buffer_overflow',
          'Не удалось подключиться к Grok Voice. Попробуйте ещё раз.'
        )
        return
      }
      pendingClientFrames.push(data)
      pendingClientBytes += frameBytes
      flushPendingClientFrames()
    }

    upstream = createUpstreamWebSocket(upstreamUrl, apiKey)

    const upstreamTimeout = setTimeout(() => {
      if (upstreamOpen || closed) return
      console.warn('[engvo][xai-relay] upstream_fail timeout')
      shutdown(
        XAI_RELAY_CLOSE_INTERNAL,
        'upstream_timeout',
        'Не удалось подключиться к Grok Voice. Попробуйте ещё раз.'
      )
    }, XAI_RELAY_UPSTREAM_TIMEOUT_MS)

    const flushBufferedUpstreamFrames = () => {
      while (bufferedUpstreamFrames.length > 0) {
        const frame = bufferedUpstreamFrames.shift()
        if (!frame) break
        if (!forwardWithBackpressure(clientWs, frame)) {
          shutdown(XAI_RELAY_CLOSE_INTERNAL, 'forward_failed')
          return
        }
      }
    }

    upstream.on('open', () => {
      clearTimeout(upstreamTimeout)
      upstreamOpen = true
      console.info('[engvo][xai-relay] upstream_open', { model })
      engvoServerDebugLog({
        location: 'xai-relay/route.ts:upstream-open',
        message: 'upstream xAI ws open',
        data: { model, pendingClientFrames: pendingClientFrames.length },
        hypothesisId: 'H3',
      })
      try {
        clientWs.send(JSON.stringify({ type: ENGVO_XAI_RELAY_READY_EVENT }))
      } catch {
        // ignore
      }
      flushPendingClientFrames()
    })

    upstream.on('message', (data) => {
      if (closed) return
      const asString = typeof data === 'string' ? data : data.toString()
      if (
        asString.includes('session.created') ||
        asString.includes('session.updated') ||
        asString.includes('session.update.acknowledged')
      ) {
        console.info('[engvo][xai-relay] upstream_session_ack')
        engvoServerDebugLog({
          location: 'xai-relay/route.ts:upstream-ack',
          message: 'upstream session ack',
          data: {
            clientSessionUpdateSeen,
            bufferedUpstreamFrames: bufferedUpstreamFrames.length,
            preview: asString.slice(0, 120),
          },
          hypothesisId: 'H5',
        })
      }
      if (!clientSessionUpdateSeen) {
        bufferedUpstreamFrames.push(data as WebSocketData)
        return
      }
      forwardWithBackpressure(clientWs, data as WebSocketData)
    })

    upstream.on('error', (error) => {
      console.warn('[engvo][xai-relay] upstream_error', error)
      shutdown(
        XAI_RELAY_CLOSE_INTERNAL,
        'upstream_error',
        'Не удалось подключиться к Grok Voice. Попробуйте ещё раз.'
      )
    })

    upstream.on('close', () => {
      if (!closed) shutdown(XAI_RELAY_CLOSE_INTERNAL, 'upstream_closed')
    })

    clientWs.on('message', (data: WebSocketData) => {
      if (closed) return
      const sawSessionUpdate = !clientSessionUpdateSeen && isClientSessionUpdateFrame(data)
      if (sawSessionUpdate) {
        clientSessionUpdateSeen = true
        engvoServerDebugLog({
          location: 'xai-relay/route.ts:client-session-update',
          message: 'client session.update seen',
          data: { bufferedUpstreamFrames: bufferedUpstreamFrames.length },
          hypothesisId: 'H1',
        })
      }
      if (upstreamOpen && upstream?.readyState === WebSocket.OPEN) {
        if (!forwardWithBackpressure(upstream, data)) {
          shutdown(XAI_RELAY_CLOSE_INTERNAL, 'forward_failed')
          return
        }
        if (sawSessionUpdate) flushBufferedUpstreamFrames()
        return
      }
      enqueueClientFrame(data)
      if (sawSessionUpdate && upstreamOpen) flushBufferedUpstreamFrames()
    })

    clientWs.on('error', (error) => {
      console.warn('[engvo][xai-relay] client_error', error)
      shutdown(XAI_RELAY_CLOSE_INTERNAL, 'client_error')
    })

    clientWs.on('close', () => {
      if (!closed) shutdown(XAI_RELAY_CLOSE_INTERNAL, 'client_closed')
    })

    console.info('[engvo][xai-relay] relay_open', { model })
  })
}
