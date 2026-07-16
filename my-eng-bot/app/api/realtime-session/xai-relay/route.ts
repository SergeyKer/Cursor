import type { NextRequest } from 'next/server'
// loadWs FIRST: sets WS_NO_BUFFER_UTIL before any `ws` Receiver init in this route graph.
import WebSocket from '@/lib/engvo/loadWs'
import { experimental_upgradeWebSocket } from '@vercel/functions'
import type { RawData } from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT } from '@/lib/engvo/pcm'
import {
  buildXaiRelayErrorFrame,
  buildXaiUpstreamWsUrl,
  encodeRelayForwardPayload,
  isAllowedRelayOrigin,
  isRelaySessionUpdatePayload,
  resolveXaiRelayModel,
  relayForwardPayloadByteLength,
  XAI_RELAY_CLIENT_BUFFER_MAX_BYTES,
  XAI_RELAY_CLIENT_BUFFER_MAX_FRAMES,
  XAI_RELAY_CLOSE_INTERNAL,
  XAI_RELAY_UPSTREAM_TIMEOUT_MS,
  ENGVO_XAI_RELAY_READY_EVENT,
  type EngvoXaiRelayForwardPayload,
} from '@/lib/engvo/xaiRelay'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE } from '@/lib/engvo/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

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

function forwardEncoded(
  to: WebSocket,
  frame: EngvoXaiRelayForwardPayload
): boolean {
  if (to.readyState !== WebSocket.OPEN) return false
  if (to.bufferedAmount > ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT) {
    const asString =
      typeof frame.payload === 'string' ? frame.payload : frame.payload.toString('utf8')
    if (asString.includes('input_audio_buffer.append')) {
      console.warn('[engvo][xai-relay] dropping mic append due to backpressure')
      return false
    }
  }
  try {
    to.send(frame.payload, { binary: frame.binary })
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
    const pendingClientFrames: EngvoXaiRelayForwardPayload[] = []
    let pendingClientBytes = 0

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
        pendingClientBytes -= relayForwardPayloadByteLength(frame)
        if (isRelaySessionUpdatePayload(frame.payload)) {
          console.info('[engvo][xai-relay] client_session_update_forwarded', {
            binary: frame.binary,
            typeofPayload: typeof frame.payload,
          })
        }
        if (!forwardEncoded(upstream, frame)) {
          shutdown(XAI_RELAY_CLOSE_INTERNAL, 'forward_failed')
          return
        }
      }
    }

    const enqueueClientFrame = (frame: EngvoXaiRelayForwardPayload) => {
      if (closed) return
      const frameBytes = relayForwardPayloadByteLength(frame)
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
      pendingClientFrames.push(frame)
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

    upstream.on('open', () => {
      clearTimeout(upstreamTimeout)
      upstreamOpen = true
      console.info('[engvo][xai-relay] upstream_open', { model })
      try {
        clientWs.send(JSON.stringify({ type: ENGVO_XAI_RELAY_READY_EVENT }), { binary: false })
        console.info('[engvo][xai-relay] relay_ready_sent', { model })
      } catch (error) {
        console.warn('[engvo][xai-relay] relay_ready_send_failed', error)
      }
      flushPendingClientFrames()
    })

    upstream.on('message', (data: RawData, isBinary: boolean) => {
      if (closed) return
      const frame = encodeRelayForwardPayload(data, isBinary)
      const asString =
        typeof frame.payload === 'string' ? frame.payload : frame.payload.toString('utf8')
      if (
        !frame.binary &&
        (asString.includes('session.created') ||
          asString.includes('session.updated') ||
          asString.includes('session.update.acknowledged') ||
          asString.includes('conversation.created'))
      ) {
        console.info('[engvo][xai-relay] upstream_session_ack', {
          isBinary,
          binary: frame.binary,
          typeofPayload: typeof frame.payload,
        })
      }
      if (!forwardEncoded(clientWs, frame)) {
        shutdown(XAI_RELAY_CLOSE_INTERNAL, 'forward_failed')
      }
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

    clientWs.on('message', (data: RawData, isBinary: boolean) => {
      if (closed) return
      const frame = encodeRelayForwardPayload(data, isBinary)
      if (upstreamOpen && upstream?.readyState === WebSocket.OPEN) {
        if (isRelaySessionUpdatePayload(frame.payload)) {
          console.info('[engvo][xai-relay] client_session_update_forwarded', {
            binary: frame.binary,
            typeofPayload: typeof frame.payload,
          })
        }
        if (!forwardEncoded(upstream, frame)) {
          shutdown(XAI_RELAY_CLOSE_INTERNAL, 'forward_failed')
        }
        return
      }
      enqueueClientFrame(frame)
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
